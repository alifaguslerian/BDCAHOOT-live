import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { io } from 'socket.io-client';
import { GameProvider, useGame } from '../context/GameContext';
import { createSocketServer } from '../server/socketServer';
import type { Reply, SessionCredentials } from '../types/network';

const quiz = { id: 'faults', title: 'Recovery test', createdAt: 1, updatedAt: 1,
  questions: Array.from({ length: 3 }, (_, i) => ({ id: `q${i}`, question: `Question ${i}`,
    options: ['A','B','C','D'].map(id => ({ id, text: id })), correctOption: 'B', timerSeconds: 30 })) };

async function fixture() {
  let time = 1_800_000_000_000;
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'fault-test-operator', now: () => time });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const dom = new JSDOM('<div id="root"></div>', { url, pretendToBeVisual: true });
  const globals = { window: dom.window, document: dom.window.document, location: dom.window.location,
    sessionStorage: dom.window.sessionStorage, IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  let state!: ReturnType<typeof useGame>;
  function Probe() { state = useGame(); return null; }
  let root: Root;
  async function mount() {
    root = createRoot(dom.window.document.getElementById('root')!);
    await act(async () => { root.render(React.createElement(GameProvider, null, React.createElement(Probe))); });
  }
  async function until(predicate: () => boolean, timeout = 10000) {
    const end = performance.now() + timeout;
    while (!predicate() && performance.now() < end) await act(async () => { await delay(20); });
    assert.ok(predicate(), `Condition timed out: ${state?.connection} / ${state?.error}`);
  }
  const host = io(url, { transports: ['websocket'], forceNew: true });
  await new Promise<void>(resolve => host.once('connect', resolve));
  const created = await host.timeout(3000).emitWithAck('room:create', { quiz, hostKey: 'fault-test-operator', requestId: randomUUID() }) as Reply<SessionCredentials>;
  assert(created.success);
  await mount(); await until(() => state.connection === 'Terhubung');
  return { service, host, owner: created.data, dom, get state() { return state; }, until,
    advance: (ms: number) => { time += ms; service.engine.tick(); },
    remount: async () => { await act(async () => root.unmount()); await mount(); await until(() => state.connection === 'Terhubung'); },
    close: async () => {
      await act(async () => { root.unmount(); host.disconnect(); await service.close(); });
      dom.window.close();
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test('lost join ACK followed by refresh reuses the same player identity', { timeout: 20000 }, async () => {
  const f = await fixture();
  try {
    let dropped = false;
    for (const socket of f.service.io.sockets.sockets.values()) socket.use((packet, next) => {
      if (packet[0] === 'room:join' && !dropped) { dropped = true; packet[2] = () => {}; }
      next();
    });
    await act(async () => {
      const result = await f.state.joinRoomAsPlayer('ALDI', f.owner.code);
      assert.equal(result.success, false);
    });
    assert.equal(dropped, true);
    const originalPlayer = Object.keys(f.service.engine.view(f.owner).players)[0];
    await f.remount();
    await act(async () => {
      const result = await f.state.joinRoomAsPlayer('ALDI', f.owner.code);
      assert.equal(result.success, true);
    });
    assert.equal(f.state.currentPlayerId, originalPlayer);
    assert.equal(Object.keys(f.service.engine.view(f.owner).players).length, 1);
  } finally { await f.close(); }
});

test('delayed session-ended event from another room cannot erase the current session', async () => {
  const f = await fixture();
  try {
    await act(async () => { assert.equal((await f.state.joinRoomAsPlayer('ALDI', f.owner.code)).success, true); });
    const playerId = f.state.currentPlayerId;
    await act(async () => {
      for (const socket of f.service.io.sockets.sockets.values()) {
        if (socket.data.credentials?.role === 'player') socket.emit('session:ended', 'Old room closed', 'older-session');
      }
      await delay(50);
    });
    assert.equal(f.state.currentPlayerId, playerId);
    assert.equal(f.state.hasRoom, true);
    await act(async () => {
      for (const socket of f.service.io.sockets.sockets.values()) {
        if (socket.data.credentials?.role === 'player') socket.emit('session:ended', 'Old player kicked', f.owner.sessionId, 'older-player');
      }
      await delay(50);
    });
    assert.equal(f.state.currentPlayerId, playerId);
    await act(async () => {
      f.service.engine.command(f.owner, { action: 'kick', sessionId: f.owner.sessionId, revision: f.service.engine.view(f.owner).revision, playerId: playerId! });
      await delay(150);
    });
    assert.equal(f.state.hasRoom, false);
  } finally { await f.close(); }
});

test('lost resume ACK retries automatically and repeated reconnects retain identity', { timeout: 25000 }, async () => {
  const f = await fixture();
  try {
    await act(async () => { await f.state.joinRoomAsPlayer('ALDI', f.owner.code); });
    const playerId = f.state.currentPlayerId;
    let dropped = false;
    f.service.io.on('connection', socket => socket.use((packet, next) => {
      if (packet[0] === 'session:resume' && !dropped) { dropped = true; packet[2] = () => {}; }
      next();
    }));
    await f.remount();
    assert.equal(dropped, true);
    assert.equal(f.state.currentPlayerId, playerId);
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        for (const socket of f.service.io.sockets.sockets.values()) if (socket.data.credentials?.role === 'player') socket.conn.close();
        await delay(30);
      });
      await f.until(() => f.state.connection === 'Terhubung');
      assert.equal(f.state.currentPlayerId, playerId);
      assert.equal(f.state.hasRoom, true);
    }
    assert.equal(Object.keys(f.service.engine.view(f.owner).players).length, 1);
    assert.equal(f.service.io.sockets.sockets.size, 2);
  } finally { await f.close(); }
});

test('answer delayed past the deadline is rejected and the optimistic pending choice clears', async () => {
  const f = await fixture();
  try {
    await act(async () => { await f.state.joinRoomAsPlayer('ALDI', f.owner.code); });
    f.service.engine.command(f.owner, { action: 'start', sessionId: f.owner.sessionId, revision: f.service.engine.view(f.owner).revision });
    await f.until(() => f.state.room.stage === 'QUESTION');
    let deliver: (() => void) | undefined;
    for (const socket of f.service.io.sockets.sockets.values()) socket.use((packet, next) => {
      if (packet[0] === 'answer:submit') deliver = next;
      else next();
    });
    const playerId = f.state.currentPlayerId!;
    let pending!: ReturnType<typeof f.state.submitAnswer>;
    await act(async () => { pending = f.state.submitAnswer(playerId, 'B'); });
    await f.until(() => Boolean(deliver));
    assert.equal(f.state.pendingOption, 'B');
    assert.ok(deliver);
    f.advance(30201);
    await act(async () => { deliver!(); assert.equal((await pending).success, false); });
    assert.equal(f.state.pendingOption, null);
    assert.equal(f.state.answerConfirmed, false);
    assert.equal(f.service.engine.view(f.owner).players[playerId].score, 0);
  } finally { await f.close(); }
});

test('lost answer ACK is recovered on reconnect without changing the choice or duplicating points', { timeout: 20000 }, async () => {
  const f = await fixture();
  try {
    await act(async () => { await f.state.joinRoomAsPlayer('ALDI', f.owner.code); });
    f.service.engine.command(f.owner, { action: 'start', sessionId: f.owner.sessionId, revision: f.service.engine.view(f.owner).revision });
    await f.until(() => f.state.room.stage === 'QUESTION');
    let dropped = false;
    for (const socket of f.service.io.sockets.sockets.values()) socket.use((packet, next) => {
      if (packet[0] === 'answer:submit' && !dropped) { dropped = true; packet[2] = () => {}; }
      next();
    });
    const playerId = f.state.currentPlayerId!;
    await act(async () => { assert.equal((await f.state.submitAnswer(playerId, 'B')).success, false); });
    assert.equal(f.state.pendingOption, 'B');
    await act(async () => {
      for (const socket of f.service.io.sockets.sockets.values()) if (socket.data.credentials?.role === 'player') socket.conn.close();
      await delay(20);
    });
    await f.until(() => f.state.connection === 'Terhubung' && f.state.answerConfirmed);
    assert.equal(f.state.pendingOption, 'B');
    await act(async () => { await f.state.submitAnswer(playerId, 'A'); });
    f.advance(30201);
    const result = f.service.engine.view(f.owner);
    assert.equal(result.players[playerId].score, 2000);
    assert.equal(result.answeredCount, 1);
  } finally { await f.close(); }
});

test('delayed answer ACK from the previous question cannot replace the next pending choice', async () => {
  const f = await fixture();
  try {
    await act(async () => { await f.state.joinRoomAsPlayer('ALDI', f.owner.code); });
    const command = (action: 'start' | 'next') => f.service.engine.command(f.owner, { action, sessionId: f.owner.sessionId, revision: f.service.engine.view(f.owner).revision });
    command('start'); await f.until(() => f.state.room.stage === 'QUESTION');
    let release: (() => void) | undefined;
    for (const socket of f.service.io.sockets.sockets.values()) socket.use((packet, next) => {
      if (packet[0] === 'answer:submit' && !release) {
        const ack = packet[2]; packet[2] = (reply: unknown) => { release = () => ack(reply); };
      }
      next();
    });
    let first!: ReturnType<typeof f.state.submitAnswer>;
    await act(async () => { first = f.state.submitAnswer(f.state.currentPlayerId!, 'B'); });
    await f.until(() => Boolean(release));
    assert.ok(release);
    f.advance(35000); command('next');
    await f.until(() => f.state.room.currentQuestionIndex === 1);
    await act(async () => { await f.state.submitAnswer(f.state.currentPlayerId!, 'A'); release!(); await first; });
    assert.equal(f.state.pendingOption, 'A');
    assert.equal(f.state.answerConfirmed, true);
  } finally { await f.close(); }
});

test('returning to a visible page refreshes a stale question snapshot', async () => {
  const f = await fixture();
  try {
    await act(async () => { await f.state.joinRoomAsPlayer('ALDI', f.owner.code); });
    const command = (action: 'start' | 'next') => f.service.engine.command(f.owner, { action, sessionId: f.owner.sessionId, revision: f.service.engine.view(f.owner).revision });
    command('start'); await f.until(() => f.state.room.stage === 'QUESTION');
    const socket = [...f.service.io.sockets.sockets.values()].find(s => s.data.credentials?.role === 'player')!;
    const emit = socket.emit;
    // Simulate missed state updates while the page was suspended; resume ACK remains available.
    socket.emit = ((event: string, ...args: unknown[]) => {
      if (event === 'room:state') return false;
      return Reflect.apply(emit, socket, [event, ...args]);
    }) as typeof socket.emit;
    f.advance(35000); command('next');
    await act(async () => { await delay(150); });
    assert.equal(f.state.room.currentQuestionIndex, 0);
    await act(async () => { f.dom.window.document.dispatchEvent(new f.dom.window.Event('visibilitychange')); });
    await f.until(() => f.state.room.currentQuestionIndex === 1 && f.state.connection === 'Terhubung');
    socket.emit = emit;
    assert.equal(f.state.pendingOption, null);
    await act(async () => { assert.equal((await f.state.submitAnswer(f.state.currentPlayerId!, 'B')).success, true); });
  } finally { await f.close(); }
});
