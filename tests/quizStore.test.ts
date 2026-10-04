import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { getStoredQuizzes, connectQuizLibrary, disconnectQuizLibrary, saveQuiz, deleteQuiz, createNewDraftQuiz } from '../lib/quizStore';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SnapshotStore } from '../server/persistence';
import { createSocketServer } from '../server/socketServer';

test('browser migration survives retries, keeps backup and reads server data from a fresh browser', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-library-client-'));
  const persistence = await SnapshotStore.open(join(dir, 'game.sqlite'));
  const http = createServer();
  const service = createSocketServer(http, { hostKey: 'test-operator-key', persistence });
  await service.ready;
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address(); assert(address && typeof address !== 'string');
  const dom = new JSDOM('', { url: `http://127.0.0.1:${address.port}` });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  try {
    const saved = [{ ...createNewDraftQuiz(), id: 'host-private', title: 'Existing Host quiz' }];
    dom.window.localStorage.setItem('bdcahoot_quiz_library_v1', JSON.stringify(saved));
    await assert.rejects(connectQuizLibrary('wrong'), /operator/);
    assert.equal(dom.window.localStorage.getItem('bdcahoot_quiz_library_v1'), JSON.stringify(saved));
    await connectQuizLibrary('test-operator-key');
    assert.equal(getStoredQuizzes()[0].title, 'Existing Host quiz');
    assert.equal(dom.window.localStorage.getItem('bdcahoot_quiz_library_v1_backup'), JSON.stringify(saved));
    const partial = [{ ...saved[0], id: 'valid-before-failure' }, { id: 'broken-draft' }];
    dom.window.localStorage.setItem('bdcahoot_quiz_library_v1', JSON.stringify(partial));
    await assert.rejects(connectQuizLibrary('test-operator-key'));
    assert.equal(dom.window.localStorage.getItem('bdcahoot_quiz_library_v1'), JSON.stringify(partial));
    // After correcting the bad entry, a retry must not duplicate the already committed import.
    dom.window.localStorage.setItem('bdcahoot_quiz_library_v1', JSON.stringify([partial[0]]));
    await connectQuizLibrary('test-operator-key');
    assert.equal(getStoredQuizzes().filter(q => q.id === 'valid-before-failure').length, 1);
    await deleteQuiz('valid-before-failure');
    const edited = await saveQuiz({ ...getStoredQuizzes()[0], title: 'Server version' });
    disconnectQuizLibrary();
    dom.window.localStorage.clear(); dom.window.sessionStorage.clear();
    await connectQuizLibrary('test-operator-key');
    assert.equal(getStoredQuizzes()[0].title, 'Server version');
    await deleteQuiz(edited.id);
    dom.window.localStorage.setItem('bdcahoot_quiz_library_v1', JSON.stringify(saved));
    await connectQuizLibrary('test-operator-key');
    assert.deepEqual(getStoredQuizzes(), []);
    disconnectQuizLibrary();
    await assert.rejects(saveQuiz(createNewDraftQuiz()));
  } finally {
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
    disconnectQuizLibrary();
    await service.close();
    await rm(dir, { recursive: true, force: true });
  }
});
