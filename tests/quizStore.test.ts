import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { getStoredQuizzes } from '../lib/quizStore';

test('new and deliberately empty libraries stay empty; existing Host quizzes are preserved', () => {
  const dom = new JSDOM('', { url: 'http://localhost' });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, localStorage: dom.window.localStorage })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  try {
    assert.deepEqual(getStoredQuizzes(), []);
    dom.window.localStorage.setItem('bdcahoot_quiz_library_v1', '[]');
    assert.deepEqual(getStoredQuizzes(), []);
    const saved = [{ id: 'host-private', title: 'Existing Host quiz', questions: [] }];
    dom.window.localStorage.setItem('bdcahoot_quiz_library_v1', JSON.stringify(saved));
    assert.deepEqual(getStoredQuizzes(), saved);
  } finally {
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    dom.window.close();
  }
});
