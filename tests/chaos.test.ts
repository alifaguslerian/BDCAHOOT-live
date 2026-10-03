import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { createSocketServer } from '../server/socketServer';
import type { RoomView, SessionCredentials } from '../types/network';

const quiz = { title: 'Chaos', questions: [{ id: 'q', question: 'Q', options: ['A', 'B', 'C', 'D'].map(id => ({ id, text: id })), correctOption: 'B', timerSeconds: 5 }] };

test('slow question-opening commit does not consume the answering window', async () => {
  let now = 10000, slow = false;
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'chaos-operator-key', now: () => now, persistence: {
    initial: null, save: async () => { if (slow) { now += 1500; await delay(20); } }, close: async () => {},
  } });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const socket = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], reconnection: false });
  try {
    await new Promise<void>(resolve => socket.once('connect', resolve));
    const created = await socket.timeout(3000).emitWithAck('room:create', { quiz, hostKey: 'chaos-operator-key', requestId: randomUUID() });
    assert(created.success); const host = created.data as SessionCredentials;
    await socket.timeout(3000).emitWithAck('room:join', { code: host.code, name: 'ANA', requestId: randomUUID() });
    await socket.timeout(3000).emitWithAck('session:resume', host);
    slow = true;
    const started = await socket.timeout(3000).emitWithAck('host:command', { sessionId: host.sessionId, revision: service.engine.view(host).revision, action: 'start' });
    assert(started.success);
    const resumed = await socket.timeout(3000).emitWithAck('session:resume', host);
    const view = resumed.data as RoomView;
    assert.equal(view.questionEndsAtMs! - now, 5000);
    assert.equal(view.questionStartedAtMs, now);
  } finally { slow = false; socket.disconnect(); await service.close(); }
});

test('stalled storage bounds pending requests and stops transport without successful ACK', { timeout: 10000 }, async () => {
  let release!: () => void;
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'chaos-operator-key', persistence: {
    initial: null, save: () => new Promise<void>(resolve => { release = resolve; }), close: async () => {},
  } });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const socket = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], reconnection: false });
  let successes = 0, limited = 0;
  try {
    await new Promise<void>(resolve => socket.once('connect', resolve));
    socket.emit('room:create', { quiz, hostKey: 'chaos-operator-key', requestId: randomUUID() }, (reply: { success: boolean }) => { if (reply.success) successes++; });
    while (!release) await delay(5);
    const code = service.engine.roomCodes()[0];
    for (let i = 0; i < 40; i++) socket.emit('room:inspect', { code }, (reply: { success: boolean; code?: string }) => {
      if (reply.success) successes++;
      if (reply.code === 'RATE_LIMIT') limited++;
    });
    await delay(200);
    assert(limited >= 30, `pending requests not bounded: ${limited} rejected`);
    await delay(5200);
    assert.equal(socket.connected, false);
    assert.equal(successes, 0);
  } finally {
    socket.disconnect();
    // Release the injected stall so cleanup also works against the unfixed server.
    const close = service.close();
    const cleanup = setInterval(() => release?.(), 10);
    try { await close; } finally { clearInterval(cleanup); }
  }
});
