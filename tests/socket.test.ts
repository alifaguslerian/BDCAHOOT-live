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

async function fixture() {
  let time = 1_800_000_000_000;
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'test-operator-key', now: () => time });
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
  return { service, connect, advance: (ms: number) => { time += ms; service.engine.tick(); },
    close: async () => { clients.forEach(s => s.disconnect()); await service.close(); } };
}
async function request<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  if (event === 'room:create' && payload && typeof payload === 'object' && !('requestId' in payload)) payload = { ...payload, requestId: randomUUID() };
  const reply = await socket.timeout(5000).emitWithAck(event, payload) as Reply<T>;
  if (!reply.success) throw Error(reply.error);
  return reply.data;
}
const resume = (socket: Socket, credentials: SessionCredentials) => request<RoomView>(socket, 'session:resume', credentials);

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
