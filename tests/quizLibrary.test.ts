import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io } from 'socket.io-client';
import { SnapshotStore } from '../server/persistence';
import { createSocketServer } from '../server/socketServer';

const quiz = { id: 'library-test', title: 'Event tomorrow', createdAt: 1, updatedAt: 0,
  questions: [{ id: 'q1', question: '', options: ['A','B','C','D'].map(id => ({ id, text: '' })), correctOption: 'A', timerSeconds: 20 }] };

test('operator library persists drafts across server restart and protects edits from stale tabs and imports', { timeout: 15000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-library-'));
  const path = join(dir, 'game.sqlite');
  async function boot() {
    const persistence = await SnapshotStore.open(path);
    const http = createServer();
    const service = createSocketServer(http, { hostKey: 'test-operator-key', persistence });
    await service.ready;
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
    const address = http.address(); assert(address && typeof address !== 'string');
    const socket = io(`http://127.0.0.1:${address.port}`, { transports: ['websocket'], reconnection: false });
    await new Promise<void>(resolve => socket.once('connect', resolve));
    const request = async (payload: object, key = 'test-operator-key') => {
      const reply = await socket.timeout(1000).emitWithAck('library:request', { ...payload, hostKey: key });
      if (!reply.success) throw Error(reply.error);
      return reply.data;
    };
    return { request, close: async () => { socket.disconnect(); await service.close(); } };
  }
  let f = await boot();
  try {
    await assert.rejects(f.request({ action: 'list' }, 'wrong'), /operator/);
    assert.deepEqual(await f.request({ action: 'list' }), []);
    const saved = await f.request({ action: 'save', quiz });
    assert(saved.updatedAt > 0);
    await f.close(); f = await boot();
    assert.equal((await f.request({ action: 'get', id: quiz.id })).title, 'Event tomorrow');
    const edited = await f.request({ action: 'save', quiz: { ...saved, title: 'Final event' } });
    await assert.rejects(f.request({ action: 'save', quiz: { ...saved, title: 'Stale tab' } }), /berubah/);
    await f.request({ action: 'import', quiz: { ...quiz, title: 'Old browser copy' } });
    assert.equal((await f.request({ action: 'get', id: quiz.id })).title, 'Final event');
    await assert.rejects(f.request({ action: 'save', quiz: { ...edited, questions: [{ ...quiz.questions[0], options: [] }] } }));
    await assert.rejects(f.request({ action: 'delete', id: quiz.id, updatedAt: saved.updatedAt }), /berubah/);
    await f.request({ action: 'delete', id: quiz.id, updatedAt: edited.updatedAt });
    await f.request({ action: 'import', quiz });
    assert.deepEqual(await f.request({ action: 'list' }), []);
    assert.equal(await f.request({ action: 'get', id: quiz.id }), null);
  } finally { await f.close(); await rm(dir, { recursive: true, force: true }); }
});
