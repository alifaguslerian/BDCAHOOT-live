import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { createSocketServer } from '../server/socketServer';
import type { SessionCredentials } from '../types/network';

test('a durable answer ACK does not wait for a newer unrelated write; broadcasts still wait', { timeout: 10000 }, async () => {
  let now = 10000, hold = false;
  const writes: (() => void)[] = [];
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'commit-scope-test', now: () => now, persistence: {
    initial: null, save: () => hold ? new Promise<void>(resolve => writes.push(resolve)) : Promise.resolve(), close: async () => {},
  } });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const sockets: ReturnType<typeof io>[] = [];
  async function connect() {
    const socket = io(url, { transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  }
  async function until(predicate: () => boolean) {
    for (let i = 0; i < 100 && !predicate(); i++) await delay(5);
    assert(predicate(), 'condition did not settle');
  }
  const pending: Promise<unknown>[] = [];
  try {
    const host = await connect(), a = await connect(), b = await connect();
    const created = await host.timeout(2000).emitWithAck('room:create', { hostKey: 'commit-scope-test', requestId: randomUUID(), quiz: {
      title: 'Commit scope', questions: [{ id: 'q', question: 'Q', timerSeconds: 15, correctOption: 'B', options: ['A','B','C','D'].map(id => ({ id, text: id })) }],
    } });
    assert(created.success); const owner = created.data as SessionCredentials;
    for (const [socket, name] of [[a, 'ANA'], [b, 'BOB']] as const) {
      assert((await socket.timeout(2000).emitWithAck('room:join', { code: owner.code, name, requestId: randomUUID() })).success);
    }
    assert((await host.timeout(2000).emitWithAck('host:command', { sessionId: owner.sessionId, revision: service.engine.view(owner).revision, action: 'start' })).success);
    now += 5000;
    service.engine.tick();
    await until(() => service.engine.view(owner).questionStartedAtMs !== null);
    const other = service.engine.createRoom({ title: 'Other room', questions: [
      { id: 'other-q', question: 'Q', timerSeconds: 5, correctOption: 'A', options: ['A','B','C','D'].map(id => ({ id, text: id })) },
    ] });
    service.engine.join(other.code, 'OTHER', randomUUID());
    assert((await host.timeout(2000).emitWithAck('session:resume', owner)).success);
    await delay(150);
    let count = 0, firstAck = false, secondAck = false;
    host.on('room:count', data => { count = data.count; });
    hold = true;
    const packet = () => ({ sessionId: owner.sessionId, questionIndex: 0, option: 'B', submissionId: randomUUID() });
    pending.push(a.timeout(2000).emitWithAck('answer:submit', packet()).then(reply => { assert(reply.success); firstAck = true; }));
    await until(() => writes.length === 1);
    pending.push(b.timeout(2000).emitWithAck('answer:submit', packet()).then(reply => { assert(reply.success); secondAck = true; }));
    await until(() => service.engine.view(owner).answeredCount === 2);
    service.engine.command(other, { sessionId: other.sessionId, revision: service.engine.view(other).revision, action: 'start' });
    assert.equal(firstAck, false);
    writes[0]();
    await until(() => writes.length === 2);
    await delay(150);
    assert.equal(firstAck, true, 'first answer is durable but ACK is blocked by second answer');
    assert.equal(secondAck, false, 'second answer must not ACK before its own commit');
    assert.equal(count, 0, 'uncommitted second answer must not appear in broadcasts');
    assert.equal(service.engine.view(other).countdownEndsAtMs, null, 'an older commit must not activate a newer uncommitted countdown');
    writes[1]();
    await Promise.all(pending);
    await until(() => count === 2);
    assert.equal(service.engine.view(other).countdownEndsAtMs, now + 5000);
  } finally {
    hold = false; writes.forEach(resolve => resolve());
    await Promise.allSettled(pending);
    sockets.forEach(socket => socket.disconnect());
    await service.close();
  }
});
