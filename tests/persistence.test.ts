import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { serialize } from 'node:v8';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { io } from 'socket.io-client';
import { GameEngine } from '../server/gameEngine';
import { SnapshotStore } from '../server/persistence';
import { createSocketServer } from '../server/socketServer';
import type { Reply, RoomView, SessionCredentials } from '../types/network';

const quiz = { title: 'Recovery', questions: [0, 1].map(i => ({ id: `q${i}`, question: 'Question',
  options: ['A', 'B', 'C', 'D'].map(id => ({ id, text: id })), correctOption: 'B', timerSeconds: 5 })) };

test('SQLite hot journal rolls back an interrupted transaction to the last committed snapshot', { timeout: 10000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-journal-'));
  const path = join(dir, 'game.sqlite');
  let child: ReturnType<typeof spawn> | undefined;
  try {
    const store = await SnapshotStore.open(path);
    await store.save(Buffer.from('confirmed snapshot')); await store.close();
    child = spawn(process.execPath, [resolve('tests/helpers/interruptedSqlite.mjs'), path], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], windowsHide: true });
    assert.equal((await once(child, 'message'))[0], 'transaction-written');
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    const recovered = await SnapshotStore.open(path);
    try { assert.equal(recovered.initial?.toString(), 'confirmed snapshot'); }
    finally { await recovered.close(); }
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('concurrent shutdown calls close the database exactly once', { timeout: 3000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-close-'));
  try {
    const store = await SnapshotStore.open(join(dir, 'game.sqlite'));
    await Promise.all([store.close(), store.close()]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('snapshot restores active question to scoreboard once, preserving receipts, identities and scores', () => {
  let now = 10000;
  const engine = new GameEngine({ now: () => now });
  const host = engine.createRoom(quiz), player = engine.join(host.code, 'ANA', randomUUID());
  const absent = engine.join(host.code, 'BOB', randomUUID());
  engine.command(host, { sessionId: host.sessionId, revision: engine.view(host).revision, action: 'start' });
  now += 5000; engine.tick();
  const packet = { sessionId: host.sessionId, questionIndex: 0, submissionId: randomUUID(), option: 'B' as const };
  const receipt = engine.submit(player, packet);
  const recovered = new GameEngine({ now: () => 20000 });
  recovered.restore(engine.snapshot());
  const view = recovered.view(player);
  assert.equal(view.stage, 'SCOREBOARD');
  assert.equal(view.players[player.playerId!].score, 2000);
  assert.equal(view.players[absent.playerId!].totalResponseTimeMs, 5000);
  assert.deepEqual(recovered.submit(player, packet), receipt);
  assert.equal(recovered.resume(host).token, host.token);
  assert.throws(() => recovered.submit(absent, { ...packet, submissionId: randomUUID() }));
  const again = new GameEngine({ now: () => 30000 });
  again.restore(recovered.snapshot());
  assert.equal(again.view(absent).players[absent.playerId!].totalResponseTimeMs, 5000);
  again.command(host, { sessionId: host.sessionId, revision: again.view(host).revision, action: 'next' });
  assert.equal(again.view(host).currentQuestionIndex, 1);
});

test('SQLite persists snapshots, preserves corrupt files and excludes a second server', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-persist-'));
  const path = join(dir, 'game.sqlite');
  try {
    const store = await SnapshotStore.open(path);
    assert.equal(store.initial, null);
    await store.save(Buffer.from('snapshot'));
    await assert.rejects(SnapshotStore.open(path));
    await store.close();
    const reopened = await SnapshotStore.open(path);
    assert.equal(reopened.initial?.toString(), 'snapshot');
    await reopened.close();
    await writeFile(path, 'corrupt database');
    await assert.rejects(SnapshotStore.open(path));
    assert.equal(await readFile(path, 'utf8'), 'corrupt database');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('recovery preserves lobby/final, closes reveal once, rejects bad versions, and expires old rooms', () => {
  for (const stage of ['LOBBY', 'REVEAL', 'SCOREBOARD', 'FINAL'] as const) {
    let now = 10000;
    const engine = new GameEngine({ now: () => now });
    const host = engine.createRoom(quiz), player = engine.join(host.code, 'ANA', randomUUID());
    const command = (action: 'start' | 'reveal' | 'scoreboard' | 'finish') => engine.command(host, { sessionId: host.sessionId, revision: engine.view(host).revision, action });
    if (stage !== 'LOBBY') { command('start'); now += 5000; engine.tick(); command('reveal'); }
    if (stage === 'SCOREBOARD') command('scoreboard');
    if (stage === 'FINAL') command('finish');
    const recovered = new GameEngine({ now: () => 20000 });
    recovered.restore(engine.snapshot());
    assert.equal(recovered.view(host).stage, stage === 'REVEAL' ? 'SCOREBOARD' : stage);
    assert.equal(recovered.view(host).players[player.playerId!].totalResponseTimeMs, stage === 'LOBBY' ? 0 : 5000);
    const expired = new GameEngine({ now: () => 7 * 60 * 60 * 1000 });
    expired.restore(engine.snapshot());
    assert.deepEqual(expired.roomCodes(), []);
  }
  let writes = 0;
  assert.throws(() => createSocketServer(createServer(), { hostKey: 'recovery-test-key', persistence: {
    initial: serialize({ version: 99 }), save: async () => { writes++; }, close: async () => {},
  } }), /snapshot/);
  assert.equal(writes, 0);
});

test('ACK and state broadcast wait for storage commit; failed write never confirms success', async () => {
  let release: (() => void) | undefined, rejectWrite: ((error: Error) => void) | undefined;
  let acked = false, broadcasts = 0, failing = false;
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'recovery-test-key', persistence: {
    initial: null, save: () => new Promise<void>((resolve, reject) => { release = resolve; rejectWrite = reject; }), close: async () => {},
  } });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const socket = io(`http://127.0.0.1:${address.port}`, { reconnection: false, transports: ['websocket'] });
  try {
    await new Promise<void>(resolve => socket.once('connect', resolve));
    socket.on('room:state', () => { broadcasts++; });
    const pending = socket.timeout(1000).emitWithAck('room:create', { quiz, hostKey: 'recovery-test-key', requestId: randomUUID() }).then(reply => { acked = true; return reply; });
    while (!release) await delay(5);
    await delay(150);
    assert.equal(acked, false); assert.equal(broadcasts, 0);
    release();
    const result = await pending;
    assert.equal(result.success, true);
    release = undefined;
    const failed = socket.timeout(300).emitWithAck('room:join', { code: result.data.code, name: 'ANA', requestId: randomUUID() }).then(reply => { assert.equal(reply.success, false); }, () => {});
    while (!release) await delay(5);
    failing = true; rejectWrite!(Error('Simulated disk full'));
    await failed;
    assert.equal(socket.connected, false);
  } finally {
    socket.disconnect();
    if (!failing) { const close = service.close(); await delay(10); release?.(); await close; }
    else await service.close();
  }
});

test('100 confirmed simultaneous answers survive abrupt process termination and retry after restart', { timeout: 30000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-crash-'));
  const path = join(dir, 'game.sqlite');
  const children: ReturnType<typeof spawn>[] = [], sockets: ReturnType<typeof io>[] = [];
  async function connect(url: string) {
    const socket = io(url, { transports: ['websocket'], reconnection: false });
    sockets.push(socket); await new Promise<void>(resolve => socket.once('connect', resolve));
    return socket;
  }
  async function start() {
    const child = spawn(process.execPath, ['--import', 'tsx', resolve('tests/helpers/persistenceServer.ts'), path], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], windowsHide: true });
    children.push(child);
    const [message] = await once(child, 'message');
    const socket = await connect(message.url);
    return { child, socket, url: message.url as string };
  }
  async function request<T>(socket: ReturnType<typeof io>, event: string, payload: unknown): Promise<T> {
    const reply = await socket.timeout(5000).emitWithAck(event, payload) as Reply<T>;
    assert(reply.success, JSON.stringify(reply)); return reply.data;
  }
  try {
    const first = await start();
    const host = await request<SessionCredentials>(first.socket, 'room:create', { quiz, hostKey: 'crash-test-operator', requestId: randomUUID() });
    const players = await Promise.all(Array.from({ length: 100 }, async (_, i) => {
      const socket = await connect(first.url);
      const name = `P${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + i % 26)}`;
      const identity = await request<SessionCredentials>(socket, 'room:join', { code: host.code, name, requestId: randomUUID() });
      return { socket, identity };
    }));
    const view = await request<RoomView>(first.socket, 'session:resume', host);
    await request(first.socket, 'host:command', { sessionId: host.sessionId, revision: view.revision, action: 'start' });
    for (let i = 0; i < 100; i++) {
      const current = await request<RoomView>(first.socket, 'session:resume', host);
      if (current.stage === 'QUESTION' && current.questionStartedAtMs !== null) break;
      await delay(100);
    }
    const accepted = await Promise.all(players.map(async ({ socket, identity }) => {
      const packet = { sessionId: host.sessionId, questionIndex: 0, submissionId: randomUUID(), option: 'B' };
      const receipt = await request(socket, 'answer:submit', packet);
      return { identity, packet, receipt };
    }));
    const exited = once(first.child, 'exit'); first.child.kill('SIGKILL'); await exited;
    const second = await start();
    const hostView = await request<RoomView>(second.socket, 'session:resume', host);
    assert.equal(hostView.stage, 'SCOREBOARD'); assert.equal(hostView.answeredCount, 100);
    await Promise.all(accepted.map(async ({ identity, packet, receipt }) => {
      const socket = await connect(second.url);
      const restored = await request<RoomView>(socket, 'session:resume', identity);
      const score = restored.players[identity.playerId!].score;
      assert(score > 0);
      assert.deepEqual(await request(socket, 'answer:submit', packet), receipt);
      assert.equal((await request<RoomView>(socket, 'session:resume', identity)).players[identity.playerId!].score, score);
    }));
  } finally {
    sockets.forEach(socket => socket.disconnect());
    for (const child of children) if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    }
    await rm(dir, { recursive: true, force: true });
  }
});

test('successful socket ACK survives closing and reopening storage, including creation retry and reset', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-wire-'));
  const path = join(dir, 'game.sqlite');
  const sockets: ReturnType<typeof io>[] = [];
  const services: ReturnType<typeof createSocketServer>[] = [];
  async function start() {
    const persistence = await SnapshotStore.open(path);
    const http = createServer();
    const service = createSocketServer(http, { hostKey: 'recovery-test-key', persistence });
    services.push(service);
    await service.ready;
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
    const address = http.address(); assert(address && typeof address !== 'string');
    const socket = io(`http://127.0.0.1:${address.port}`, { reconnection: false, transports: ['websocket'] });
    sockets.push(socket);
    await new Promise<void>(resolve => socket.once('connect', resolve));
    return { service, socket };
  }
  async function request<T>(socket: ReturnType<typeof io>, event: string, payload: unknown) {
    const reply = await socket.timeout(5000).emitWithAck(event, payload) as Reply<T>;
    assert(reply.success, JSON.stringify(reply)); return reply.data;
  }
  try {
    const first = await start();
    const creation = { quiz, hostKey: 'recovery-test-key', requestId: randomUUID() };
    const host = await request<SessionCredentials>(first.socket, 'room:create', creation);
    const joinPacket = { code: host.code, name: 'ANA', requestId: randomUUID() };
    const player = await request<SessionCredentials>(first.socket, 'room:join', joinPacket);
    let view = await request<RoomView>(first.socket, 'session:resume', host);
    await request(first.socket, 'host:command', { sessionId: host.sessionId, revision: view.revision, action: 'start' });
    for (let i = 0; i < 100; i++) {
      const current = await request<RoomView>(first.socket, 'session:resume', host);
      if (current.stage === 'QUESTION' && current.questionStartedAtMs !== null) break;
      await delay(100);
    }
    await request(first.socket, 'session:resume', player);
    const packet = { sessionId: host.sessionId, questionIndex: 0, submissionId: randomUUID(), option: 'B' };
    const receipt = await request(first.socket, 'answer:submit', packet);
    await first.service.close();
    const second = await start();
    assert.deepEqual(await request(second.socket, 'room:create', creation), host);
    assert.deepEqual(await request(second.socket, 'room:join', joinPacket), player);
    assert.deepEqual(await request(second.socket, 'answer:submit', packet), receipt);
    view = await request<RoomView>(second.socket, 'session:resume', host);
    assert.equal(view.stage, 'SCOREBOARD');
    assert(view.players[player.playerId!].score > 0);
    await request(second.socket, 'host:command', { sessionId: host.sessionId, revision: view.revision, action: 'reset' });
    await second.service.close();
    const third = await start();
    assert.deepEqual(third.service.engine.roomCodes(), []);
  } finally {
    sockets.forEach(s => s.disconnect());
    for (const service of services) await service.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('crash before pending commit preserves the previous room and never confirms the lost join', { timeout: 15000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-pending-crash-'));
  const path = join(dir, 'game.sqlite');
  const children: ReturnType<typeof spawn>[] = [], sockets: ReturnType<typeof io>[] = [];
  async function start() {
    const child = spawn(process.execPath, ['--import', 'tsx', resolve('tests/helpers/persistenceServer.ts'), path], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'], windowsHide: true });
    children.push(child);
    const [message] = await once(child, 'message');
    const socket = io(message.url, { transports: ['websocket'], reconnection: false });
    sockets.push(socket); await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return { child, socket };
  }
  try {
    const first = await start();
    const created = await first.socket.timeout(3000).emitWithAck('room:create', { quiz, hostKey: 'crash-test-operator', requestId: randomUUID() });
    assert(created.success);
    const armed = once(first.child, 'message'); first.child.send('hold-next-write');
    assert.equal((await armed)[0], 'armed');
    let success = false;
    const held = once(first.child, 'message');
    first.socket.emit('room:join', { code: created.data.code, name: 'ANA', requestId: randomUUID() }, (reply: Reply<unknown>) => { success = reply.success; });
    assert.equal((await held)[0], 'write-held');
    const exited = once(first.child, 'exit'); first.child.kill('SIGKILL'); await exited;
    assert.equal(success, false);
    const second = await start();
    const resumed = await second.socket.timeout(3000).emitWithAck('session:resume', created.data);
    assert(resumed.success);
    assert.equal(resumed.data.stage, 'LOBBY');
    assert.equal(Object.keys(resumed.data.players).length, 0);
  } finally {
    sockets.forEach(socket => socket.disconnect());
    for (const child of children) if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    }
    await rm(dir, { recursive: true, force: true });
  }
});
