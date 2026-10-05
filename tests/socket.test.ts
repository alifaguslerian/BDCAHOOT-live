import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { createSocketServer } from '../server/socketServer';
import type { Reply, RoomView, SessionCredentials } from '../types/network';

const quiz = { id: 'test', title: 'Transport test', createdAt: 1, updatedAt: 1,
  questions: Array.from({ length: 40 }, (_, i) => ({ id: `q${i}`, question: `Question ${i}`,
    options: ['A','B','C','D'].map(id => ({ id, text: id })), correctOption: 'B', timerSeconds: 5 })) };

async function fixture(maxConnectionsPerAddress?: number) {
  let time = 1_800_000_000_000;
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'test-operator-key', now: () => time, maxConnectionsPerAddress });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  assert(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const clients: Socket[] = [];
  async function connect() {
    const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve); socket.once('connect_error', reject);
    });
    return socket;
  }
  return { service, connect, url, advance: (ms: number) => { time += ms; service.engine.tick(); },
    close: async () => { clients.forEach(s => s.disconnect()); await service.close(); } };
}
async function request<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  if (event === 'room:create' && payload && typeof payload === 'object' && !('requestId' in payload)) payload = { ...payload, requestId: randomUUID() };
  const reply = await socket.timeout(5000).emitWithAck(event, payload) as Reply<T>;
  if (!reply.success) throw Error(reply.error);
  return reply.data;
}
const resume = (socket: Socket, credentials: SessionCredentials) => request<RoomView>(socket, 'session:resume', credentials);
test('operator key recovers an active room without resetting players, points or question clock', async () => {
  const f = await fixture();
  try {
    const host = await f.connect(), player = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    const identity = await request<SessionCredentials>(player, 'room:join', { code: owner.code, name: 'ANA', requestId: randomUUID() });
    const lobby = await resume(host, owner);
    await request(host, 'host:command', { action: 'start', sessionId: owner.sessionId, revision: lobby.revision });
    f.advance(5000);
    await request(player, 'answer:submit', { sessionId: owner.sessionId, questionIndex: 0, submissionId: randomUUID(), option: 'B' });
    const before = f.service.engine.view(owner);
    host.disconnect();
    const replacement = await f.connect();
    await assert.rejects(request(replacement, 'host:recover', { code: owner.code, hostKey: 'wrong' }), /operator/);
    const recovered = await request<SessionCredentials>(replacement, 'host:recover', { code: owner.code, hostKey: 'test-operator-key' });
    const after = await resume(replacement, recovered);
    assert.equal(after.questionEndsAtMs, before.questionEndsAtMs);
    assert.equal(after.sessionId, before.sessionId);
    assert.deepEqual(after.players, before.players);
    assert.deepEqual(await request(replacement, 'host:recover', { code: owner.code, hostKey: 'test-operator-key' }), recovered);
    await request(replacement, 'host:command', { action: 'reset', sessionId: owner.sessionId, revision: after.revision });
    await assert.rejects(resume(player, identity));
    await assert.rejects(request(replacement, 'host:recover', { code: owner.code, hostKey: 'test-operator-key' }));
  } finally { await f.close(); }
});

test('resuming a player only refreshes that connection, not the whole room', async () => {
  const f = await fixture();
  try {
    const host = await f.connect(), player = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    const identity = await request<SessionCredentials>(player, 'room:join', { code: owner.code, name: 'ANA', requestId: randomUUID() });
    await new Promise(resolve => setTimeout(resolve, 150));
    let broadcasts = 0;
    host.on('room:state', () => { broadcasts++; });
    assert.equal((await resume(player, identity)).code, owner.code);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(broadcasts, 0);
  } finally { await f.close(); }
});

test('per-address connection cap rejects excess and releases capacity on disconnect', async () => {
  const f = await fixture(2);
  const extra = io(f.url, { autoConnect: false, transports: ['websocket'], reconnection: false });
  try {
    const first = await f.connect(); await f.connect();
    const rejected = new Promise<void>((resolve, reject) => {
      extra.once('connect_error', () => resolve()); extra.once('connect', () => reject(Error('Excess connection accepted')));
    });
    extra.connect(); await rejected;
    first.disconnect();
    await new Promise(resolve => setTimeout(resolve, 30));
    const replacement = await f.connect();
    assert(replacement.connected);
  } finally { extra.disconnect(); await f.close(); }
});

test('one bound player connection cannot register extra players but can retry and leave', async () => {
  const f = await fixture();
  try {
    const host = await f.connect(), player = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    const packet = { code: owner.code, name: 'ANA', requestId: randomUUID() };
    const identity = await request(player, 'room:join', packet);
    assert.deepEqual(await request(player, 'room:join', packet), identity);
    await assert.rejects(request(player, 'room:join', { ...packet, name: 'BOB', requestId: randomUUID() }));
    assert.equal(Object.keys((await resume(host, owner)).players).length, 1);
    await request(player, 'room:leave', {});
    await request(player, 'room:join', { ...packet, name: 'BOB', requestId: randomUUID() });
  } finally { await f.close(); }
});

test('foreign browser origin and oversized packets are rejected while healthy clients remain usable', async () => {
  const f = await fixture();
  const foreign = io(f.url, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: 'https://foreign.invalid' } });
  try {
    await new Promise<void>((resolve, reject) => {
      foreign.once('connect_error', () => resolve()); foreign.once('connect', () => reject(Error('Foreign origin accepted')));
    });
    const attacker = await f.connect(), healthy = await f.connect();
    const disconnected = new Promise<void>(resolve => attacker.once('disconnect', () => resolve()));
    attacker.emit('session:resume', { token: 'x'.repeat(300 * 1024) });
    await disconnected;
    const owner = await request<SessionCredentials>(healthy, 'room:create', { quiz, hostKey: 'test-operator-key' });
    assert.equal((await resume(healthy, owner)).stage, 'LOBBY');
  } finally { foreign.disconnect(); await f.close(); }
});

test('malformed packet flood is limited without affecting another connection', async () => {
  const f = await fixture();
  try {
    const attacker = await f.connect(), host = await f.connect();
    const replies = await Promise.all(Array.from({ length: 400 }, () => attacker.timeout(5000).emitWithAck('session:resume', null)));
    assert(replies.every(reply => !reply.success));
    assert(replies.some(reply => reply.code === 'RATE_LIMIT'));
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    assert.equal((await resume(host, owner)).stage, 'LOBBY');
  } finally { await f.close(); }
});

test('two connections sharing a player token cannot score conflicting answers twice; kick revokes both', async () => {
  const f = await fixture();
  try {
    const host = await f.connect(), first = await f.connect(), second = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    const identity = await request<SessionCredentials>(first, 'room:join', { code: owner.code, name: 'ANA', requestId: randomUUID() });
    await resume(second, identity);
    let state = await resume(host, owner);
    await request(host, 'host:command', { sessionId: owner.sessionId, revision: state.revision, action: 'kick', playerId: identity.playerId });
    await assert.rejects(resume(first, identity)); await assert.rejects(resume(second, identity));
    const replacement = await request<SessionCredentials>(first, 'room:join', { code: owner.code, name: 'ANA', requestId: randomUUID() });
    await resume(second, replacement);
    state = await resume(host, owner);
    await request(host, 'host:command', { sessionId: owner.sessionId, revision: state.revision, action: 'start' });
    f.advance(5000);
    const packet = { sessionId: owner.sessionId, questionIndex: 0, submissionId: randomUUID(), option: 'B' };
    const replies = await Promise.all([first.timeout(5000).emitWithAck('answer:submit', packet), second.timeout(5000).emitWithAck('answer:submit', { ...packet, option: 'A', submissionId: randomUUID() })]);
    assert.equal(replies.filter(reply => reply.success).length, 1);
    f.advance(5201);
    const recovered = await resume(second, replacement);
    assert.equal(recovered.answeredCount, 1);
    assert.equal(Object.keys(recovered.players[replacement.playerId!].answers).length, 1);
    assert(recovered.players[replacement.playerId!].score <= 2000);
  } finally { await f.close(); }
});

test('leaving lobby frees the name, invalidates old credentials, and allows retry', async () => {
  const f = await fixture();
  try {
    const host = await f.connect(), player = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    await assert.rejects(request(host, 'room:leave', {}), /Host/);
    const identity = await request<SessionCredentials>(player, 'room:join', { code: owner.code, name: 'ALDI', requestId: randomUUID() });
    await request(player, 'room:leave', {});
    await request(player, 'room:leave', {});
    assert.equal(Object.keys((await resume(host, owner)).players).length, 0);
    await assert.rejects(resume(player, identity));
    const replacement = await request<SessionCredentials>(player, 'room:join', { code: owner.code, name: 'ALDI', requestId: randomUUID() });
    assert.notEqual(replacement.playerId, identity.playerId);
    const view = await resume(host, owner);
    await request(host, 'host:command', { sessionId: owner.sessionId, revision: view.revision, action: 'start' });
    f.advance(5000);
    await request(player, 'room:leave', {});
    await assert.rejects(resume(player, replacement));
    assert.equal(Object.keys((await resume(host, owner)).players).length, 1);
    const active = await resume(host, owner);
    await request(host, 'host:command', { sessionId: owner.sessionId, revision: active.revision, action: 'finish' });
    const final = await resume(host, owner);
    await request(player, 'room:leave', {});
    assert.deepEqual((await resume(host, owner)).rankings, final.rankings);
    await assert.rejects(resume(player, replacement));
  } finally { await f.close(); }
});

test('creation retry restores the same room and host credentials after an uncertain ACK', async () => {
  const f = await fixture();
  try {
    const host = await f.connect();
    const payload = { quiz, hostKey: 'test-operator-key', requestId: randomUUID(), settings: {customRoomCode:'TESTAA'} };
    const first = await request<SessionCredentials>(host,'room:create',payload);
    assert.deepEqual(await request(host,'room:create',payload),first);
    assert.equal(f.service.engine.roomCodes().length,1);
    const changed = await host.timeout(5000).emitWithAck('room:create',{...payload,quiz:{...quiz,title:'different'}});
    assert.equal(changed.success,false);
    const view = await resume(host, first);
    await request(host, 'host:command', { sessionId: first.sessionId, revision: view.revision, action: 'reset' });
    const replacement = await request<SessionCredentials>(host, 'room:create', { ...payload, requestId: randomUUID() });
    assert.notEqual(replacement.sessionId, first.sessionId);
    const stale = await host.timeout(5000).emitWithAck('room:create', payload);
    assert.equal(stale.success, false);
  } finally {await f.close();}
});

test('wire rejects unauthenticated commands and host creation without operator key', async () => {
  const f = await fixture();
  try {
    const socket = await f.connect();
    for (const [event, payload] of [['host:command', { action: 'start' }], ['room:create', { quiz, hostKey: 'wrong' }], ['answer:submit', { option: 'B' }]] as const) {
      const reply = await socket.timeout(5000).emitWithAck(event, payload);
      assert.equal(reply.success, false);
    }
  } finally { await f.close(); }
});

test('wire isolates credentials, rooms, expired packets and malformed requests', async () => {
  const f = await fixture();
  try {
    const host = await f.connect(), player = await f.connect(), stranger = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    const identity = await request<SessionCredentials>(player, 'room:join', { code: owner.code, name: 'ALDI', requestId: 'private-join-request-123' });
    const forged = await stranger.timeout(5000).emitWithAck('session:resume', { ...identity, token: 'guessed' });
    assert.equal(forged.success, false);
    const promoted = await request<RoomView>(player, 'session:resume', { ...identity, role: 'host' });
    const privilege = await player.timeout(5000).emitWithAck('host:command', { sessionId: identity.sessionId, revision: promoted.revision, action: 'start' });
    assert.equal(privilege.success, false);
    let view = await resume(host, owner);
    await request(host, 'host:command', { sessionId: owner.sessionId, revision: view.revision, action: 'start' });
    f.advance(5000);
    const valid = { sessionId: owner.sessionId, questionIndex: 0, submissionId: 'private-submission-id-123', option: 'B' };
    for (const packet of [null, {}, {...valid, sessionId:'other'}, {...valid, questionIndex:1}, {...valid, option:'AB'}, {...valid, questionIndex:NaN}]) {
      const reply = await player.timeout(5000).emitWithAck('answer:submit', packet);
      assert.equal(reply.success, false);
    }
    const receipt = await request(player, 'answer:submit', valid);
    // Reconnect with no local pending record: authoritative receipt must restore the lock.
    const recoveredSocket = await f.connect();
    const recovered = await resume(recoveredSocket, identity);
    assert.deepEqual(recovered.ownReceipt, receipt);
    assert.equal(recovered.currentQuestion?.correctOption, undefined);
    const duplicate = await recoveredSocket.timeout(5000).emitWithAck('answer:submit', {...valid, option:'A'});
    assert.equal(duplicate.success, false);
    f.advance(5201);
    assert.deepEqual(await request(recoveredSocket, 'answer:submit', valid), receipt);
    view = await resume(host, owner);
    await request(host, 'host:command', { sessionId: owner.sessionId, revision: view.revision, action:'reset' });
    const old = await recoveredSocket.timeout(5000).emitWithAck('answer:submit', valid);
    assert.equal(old.success, false);
  } finally { await f.close(); }
});

test('100 real sockets complete 40 questions; reconnect/retry cannot duplicate scores or expose answers', { timeout: 60000 }, async () => {
  const f = await fixture();
  try {
    const host = await f.connect();
    const owner = await request<SessionCredentials>(host, 'room:create', { quiz, hostKey: 'test-operator-key' });
    const players = await Promise.all(Array.from({ length: 100 }, async (_, i) => {
      const socket = await f.connect();
      const name = `P${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + i % 26)}`;
      const credentials = await request<SessionCredentials>(socket, 'room:join', { code: owner.code, name, requestId: `join-request-unique-${i}` });
      return { socket, credentials };
    }));
    let state = await resume(host, owner);
    const command = async (action: string) => {
      await request(host, 'host:command', { sessionId: state.sessionId, revision: state.revision, action });
      state = await resume(host, owner);
    };
    await command('start');
    f.advance(5000);
    const start = performance.now();
    const latencies: number[] = [];
    for (let q = 0; q < 40; q++) {
      const before = await resume(players[0].socket, players[0].credentials);
      assert.equal(before.currentQuestion?.correctOption, undefined);
      assert.equal('questions' in before, false);
      f.advance(1000);
      await Promise.all(players.map(async ({socket, credentials}, i) => {
        const payload = { sessionId: owner.sessionId, questionIndex: q, submissionId: `submission-unique-${q}-${i}`, option: 'B' };
        const sent = performance.now();
        const receipt = await request(socket, 'answer:submit', payload);
        latencies.push(performance.now() - sent);
        if (i === 0) assert.deepEqual(await request(socket, 'answer:submit', payload), receipt);
        assert.equal(typeof credentials.token, 'string');
      }));
      const during = await resume(players[0].socket, players[0].credentials);
      assert.equal(during.players[players[0].credentials.playerId!].answers[q], undefined);
      f.advance(4201);
      state = await resume(host, owner);
      assert.equal(state.stage, 'REVEAL');
      f.advance(6000);
      state = await resume(host, owner);
      assert.equal(state.stage, 'SCOREBOARD');
      if (q === 10) {
        players[0].socket.disconnect();
        players[0].socket = await f.connect();
        const recovered = await resume(players[0].socket, players[0].credentials);
        assert.equal(Object.keys(recovered.players[players[0].credentials.playerId!].answers).length, 11);
        assert.deepEqual(recovered.players[players[1].credentials.playerId!].answers, {});
      }
      await command(q === 39 ? 'finish' : 'next');
    }
    assert.equal(state.stage, 'FINAL');
    assert.equal(state.rankings.length, 100);
    // At t/T=0.2, bonus=round(1000*exp(-0.8))=449; 40*1449=57960.
    for (const player of Object.values(state.players)) assert.equal(player.score, 57960);
    latencies.sort((a,b) => a-b);
    console.log(JSON.stringify({ clients: 100, questions: 40, answers: 4000, elapsedMs: Math.round(performance.now()-start), ackP95Ms: latencies[Math.floor(latencies.length*.95)], ackP99Ms: latencies[Math.floor(latencies.length*.99)] }));
  } finally { await f.close(); }
});
