import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io, type Socket } from 'socket.io-client';
import { SnapshotStore } from '../server/persistence';
import { createSocketServer } from '../server/socketServer';
import type { MatchPage, MatchResult } from '../types/matchHistory';
import type { HostCommand, Reply, RoomView, SessionCredentials } from '../types/network';

const hostKey = 'history-test-operator';
const quiz = { id: 'same-quiz', title: 'Original title', questions: [{ id: 'q', question: 'Q',
  options: ['A','B','C','D'].map(id => ({ id, text: id })), correctOption: 'B', timerSeconds: 5 }] };

async function boot(path: string, initialTime = 1_800_000_000_000) {
  let now = initialTime;
  const persistence = await SnapshotStore.open(path);
  const http = createServer();
  const service = createSocketServer(http, { hostKey, persistence, now: () => now });
  await service.ready;
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const clients: Socket[] = [];
  async function connect() {
    const socket = io(url, { transports: ['websocket'], reconnection: false });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  }
  const request = async <T>(socket: Socket, event: string, payload: unknown = {}): Promise<T> => {
    const reply = await socket.timeout(2000).emitWithAck(event, payload) as Reply<T>;
    if (!reply.success) throw Error(reply.error);
    return reply.data;
  };
  const command = (socket: Socket, host: SessionCredentials, action: HostCommand['action']) => request(socket, 'host:command', {
    sessionId: host.sessionId, revision: service.engine.view(host).revision, action,
  });
  return { service, persistence, connect, request, command,
    advance: (ms: number) => { now += ms; service.engine.tick(); },
    close: async () => { clients.forEach(s => s.disconnect()); await service.close(); },
  };
}

test('wire archives before podium; operator-only history survives close, expiry, restart and repeated quiz sessions', { timeout: 15000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-history-wire-'));
  const path = join(dir, 'game.sqlite');
  let f = await boot(path);
  try {
    const host = await f.connect(), player = await f.connect(), guest = await f.connect();
    const list = () => f.request<MatchPage>(host, 'history:request', { action: 'list', hostKey });
    assert.deepEqual((await list()).items, []);
    const owner = await f.request<SessionCredentials>(host, 'room:create', { hostKey, quiz, requestId: randomUUID(), settings: { customRoomCode: 'SAME01' } });
    const identity = await f.request<SessionCredentials>(player, 'room:join', { code: owner.code, name: 'ANA', requestId: randomUUID() });
    await f.command(host, owner, 'start'); f.advance(5000);
    await f.request(host, 'session:resume', owner);
    await f.request(player, 'answer:submit', { sessionId: owner.sessionId, questionIndex: 0, option: 'B', submissionId: randomUUID() });
    await f.command(host, owner, 'reveal');
    const result = await f.request<MatchResult>(host, 'match:result');
    assert.equal(result.id, owner.sessionId);
    assert.equal(result.rankings[0].score, 2000);
    assert.equal(result.rankings[0].correct, 1);
    assert.equal((await list()).items.length, 1);
    assert.equal(f.service.engine.view(owner).stage, 'REVEAL');
    assert.equal('token' in result, false);
    assert.equal('answers' in result.rankings[0], false);
    await assert.rejects(f.request(player, 'match:result'), /host/i);
    await assert.rejects(f.request(guest, 'match:result'), /room/i);
    await assert.rejects(f.request(player, 'history:request', { action: 'list', hostKey: '' }), /operator/i);
    for (const payload of [{ action: 'list', limit: 10000 }, { action: 'get', id: "' OR 1=1" }, { action: 'list', before: { finishedAt: 'bad', id: owner.sessionId } }, { action: 'delete', id: owner.sessionId }]) {
      await assert.rejects(f.request(host, 'history:request', { ...payload, hostKey }));
    }
    const publicView = await f.request<RoomView>(player, 'session:resume', identity);
    assert.equal(publicView.completedMatchId, undefined);
    await f.command(host, owner, 'finish'); await f.command(host, owner, 'reset');
    const another = await f.request<SessionCredentials>(host, 'room:create', { hostKey, quiz: { ...quiz, title: 'Edited title' }, requestId: randomUUID(), settings: { customRoomCode: 'SAME01' } });
    const secondPlayer = await f.connect();
    await f.request(secondPlayer, 'room:join', { code: another.code, name: 'BOB', requestId: randomUUID() });
    await f.command(host, another, 'start'); f.advance(5000); await f.request(host, 'session:resume', another);
    f.advance(5201); await f.request(host, 'session:resume', another);
    assert.equal((await list()).items.length, 2);
    f.advance(7 * 60 * 60 * 1000);
    assert.equal((await list()).items.length, 2);
    await f.close(); f = await boot(path, 1_800_030_000_000);
    const operator = await f.connect();
    const archived = await f.request<MatchResult>(operator, 'history:request', { action: 'get', id: owner.sessionId, hostKey });
    assert.deepEqual(archived, result);
    assert.equal((await f.request<MatchPage>(operator, 'history:request', { action: 'list', hostKey })).items.length, 2);
  } finally { await f.close(); await rm(dir, { recursive: true, force: true }); }
});

test('closing a completed room in the same event-loop turn cannot discard its pending archive', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-history-close-race-'));
  const f = await boot(join(dir, 'game.sqlite'));
  try {
    const host = await f.connect();
    const owner = await f.request<SessionCredentials>(host, 'room:create', { hostKey, quiz, requestId: randomUUID() });
    f.service.engine.join(owner.code, 'ANA', randomUUID());
    await f.command(host, owner, 'start'); f.advance(5000);
    await f.request(host, 'session:resume', owner);
    for (const action of ['reveal', 'reset'] as const) {
      f.service.engine.command(owner, { sessionId: owner.sessionId, revision: f.service.engine.view(owner).revision, action });
    }
    const result = await f.request<MatchResult>(host, 'history:request', { action: 'get', id: owner.sessionId, hostKey });
    assert.equal(result.id, owner.sessionId);
    assert.equal(result.rankings[0].unanswered, 1);
    assert.deepEqual(f.service.engine.roomCodes(), []);
  } finally { await f.close(); await rm(dir, { recursive: true, force: true }); }
});
