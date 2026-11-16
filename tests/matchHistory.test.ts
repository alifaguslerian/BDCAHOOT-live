import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { GameEngine } from '../server/gameEngine';
import { SnapshotStore } from '../server/persistence';
import type { MatchResult, MatchPage } from '../types/matchHistory';
import type { HostCommand, SessionCredentials } from '../types/network';
import type { QuizQuestion } from '../types/quiz';

const quiz = { id: 'repeatable-quiz', title: 'Event quiz', questions: [0, 1].map((i): QuizQuestion => ({
  id: `q${i}`, question: 'Choose B', timerSeconds: 5, correctOption: 'B',
  options: [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }, { id: 'C', text: 'C' }, { id: 'D', text: 'D' }],
})) };

function game() {
  let now = 1_800_000_000_000;
  const results: MatchResult[] = [];
  const engine = new GameEngine({ now: () => now, onComplete: result => results.push(result) });
  const command = (host: SessionCredentials, action: HostCommand['action']) =>
    engine.command(host, { sessionId: host.sessionId, revision: engine.view(host).revision, action });
  const advance = (ms: number) => { now += ms; engine.tick(); };
  const play = () => {
    const host = engine.createRoom(quiz, { customRoomCode: 'REPEAT' });
    const ana = engine.join(host.code, 'ANA', randomUUID());
    const bob = engine.join(host.code, 'BOB', randomUUID());
    engine.join(host.code, 'CARA', randomUUID());
    const answer = (player: SessionCredentials, questionIndex: number, option: 'B' | 'C') => {
      const packet = { sessionId: host.sessionId, questionIndex, option, submissionId: randomUUID() };
      engine.submit(player, packet); engine.submit(player, packet);
    };
    command(host, 'start'); advance(5000); advance(1000);
    answer(ana, 0, 'B'); answer(bob, 0, 'C');
    command(host, 'reveal'); command(host, 'scoreboard'); command(host, 'next');
    advance(1000); answer(bob, 1, 'B'); engine.leave(ana);
    advance(4201);
    return host;
  };
  return { engine, results, command, advance, play };
}

test('completion archives exact final rankings before podium, once per match even with reused quiz and room code', () => {
  const f = game();
  const first = f.play();
  assert.equal(f.results.length, 1, 'last question must produce a durable result candidate');
  assert.equal(f.engine.view(first).stage, 'REVEAL');
  const result = f.results[0];
  assert.equal(result.id, first.sessionId);
  assert.equal(result.quizId, quiz.id);
  assert.equal(result.participantCount, 3);
  assert.equal(result.questionCount, 2);
  assert.deepEqual(result.rankings.map(p => [p.rank, p.name, p.score, p.correct, p.wrong, p.unanswered, p.totalResponseTimeMs]), [
    [1, 'BOB', 1449, 1, 1, 0, 2000],
    [2, 'ANA', 1449, 1, 0, 1, 6000],
    [3, 'CARA', 0, 0, 0, 2, 10000],
  ]);
  assert(result.finishedAt >= result.startedAt!);
  const frozen = structuredClone(result);
  f.command(first, 'finish'); f.command(first, 'finish'); f.command(first, 'reset');
  assert.deepEqual(f.results[0], frozen);
  assert.equal(f.results.length, 1);
  const second = f.play();
  assert.equal(f.results.length, 2);
  assert.notEqual(second.sessionId, first.sessionId);
  assert.equal(f.results[1].quizId, quiz.id);
});

test('restart during the final question archives the recovered official score exactly once', () => {
  let now = 1_800_000_000_000;
  const engine = new GameEngine({ now: () => now });
  const host = engine.createRoom({ ...quiz, questions: quiz.questions.slice(0, 1) });
  const player = engine.join(host.code, 'ANA', randomUUID());
  engine.command(host, { sessionId: host.sessionId, revision: engine.view(host).revision, action: 'start' });
  now += 5000; engine.tick();
  engine.submit(player, { sessionId: host.sessionId, questionIndex: 0, option: 'B', submissionId: randomUUID() });
  const results: MatchResult[] = [];
  const recovered = new GameEngine({ now: () => now + 1000, onComplete: result => results.push(result) });
  recovered.restore(engine.snapshot());
  assert.equal(results.length, 1);
  assert.equal(results[0].rankings[0].score, 2000);
  assert.equal(results[0].rankings[0].unanswered, 0);
  recovered.tick();
  assert.equal(results.length, 1);
});

function databaseAction(path: string, action: string) {
  const child = spawnSync(process.execPath, ['tests/helpers/historyDatabase.mjs', path, action], { encoding: 'utf8', windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
  return child.stdout;
}

test('v1 database migration keeps existing quizzes and snapshot; archives and snapshot roll back together on either write failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-history-atomic-'));
  try {
    for (const fault of ['fail-result', 'fail-snapshot']) {
      const path = join(dir, `${fault}.sqlite`);
      databaseAction(path, 'legacy');
      let store = await SnapshotStore.open(path);
      assert.equal(store.initial?.toString(), 'old-snapshot');
      assert.equal((await store.library({ action: 'get', id: 'old-quiz' }) as { title: string }).title, 'Keep this quiz');
      await store.close();
      databaseAction(path, fault);
      store = await SnapshotStore.open(path);
      const f = game(); f.play();
      try { await assert.rejects(store.save(Buffer.from('must not commit'), f.results), /Penyimpanan/); }
      finally { await store.close(); }
      assert.deepEqual(JSON.parse(databaseAction(path, 'inspect')), { snapshot: 'old-snapshot', results: 0, version: 2 });
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('cancelled lobbies and early finishes never become completed history', () => {
  const f = game();
  const lobby = f.engine.createRoom(quiz); f.command(lobby, 'reset');
  const host = f.engine.createRoom(quiz); f.engine.join(host.code, 'ANA', randomUUID());
  f.command(host, 'start'); f.advance(5000); f.command(host, 'finish');
  assert.equal(f.results.length, 0);
});

test('recovery repeats the same immutable result and recovers final-question closure without inventing legacy history', () => {
  const f = game(); const host = f.play();
  const recovered: MatchResult[] = [];
  const engine = new GameEngine({ now: () => 1_800_000_020_000, onComplete: result => recovered.push(result) });
  engine.restore(f.engine.snapshot());
  assert.equal(recovered.length, 1);
  assert.deepEqual(recovered[0], f.results[0]);
  assert.equal(engine.view(host).stage, 'SCOREBOARD');
  const legacy = f.engine.snapshot();
  for (const room of legacy.values()) {
    delete room.historyVersion; delete room.completedAt; delete room.startedAt; delete room.quizId;
  }
  const oldResults: MatchResult[] = [];
  new GameEngine({ now: () => 1_800_000_020_000, onComplete: result => oldResults.push(result) }).restore(legacy);
  assert.equal(oldResults.length, 0);
});

test('SQLite history survives room removal, retries and reopening; pagination is stable and quizzes remain independent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bdc-history-'));
  let store: SnapshotStore | undefined;
  try {
    const path = join(dir, 'game.sqlite');
    store = await SnapshotStore.open(path);
    const f = game(); const host = f.play(); const original = f.results[0];
    assert.equal(typeof store.history, 'function', 'storage must expose archived results');
    await store.save(Buffer.from('completed'), [original]);
    await store.save(Buffer.from('closed'), [{ ...original, quizTitle: 'Do not overwrite' }]);
    f.command(host, 'reset'); f.play();
    const second = { ...f.results[1], finishedAt: original.finishedAt };
    await store.save(Buffer.from('second'), [second]);
    await store.close(); store = await SnapshotStore.open(path);
    assert.equal(store.initial?.toString(), 'second');
    assert.deepEqual(await store.history({ action: 'get', id: original.id }), original);
    const page = await store.history({ action: 'list', limit: 1 }) as MatchPage;
    assert.equal(page.items.length, 1); assert(page.nextCursor);
    assert.equal('rankings' in page.items[0], false, 'list must not load entire participant tables');
    const next = await store.history({ action: 'list', limit: 1, before: page.nextCursor }) as MatchPage;
    assert.equal(next.items.length, 1); assert.equal(next.nextCursor, null);
    assert.notEqual(page.items[0].id, next.items[0].id);
    const saved = await store.library({ action: 'save', quiz: { ...quiz, createdAt: 1, updatedAt: 0 } }) as { updatedAt: number };
    await store.library({ action: 'delete', id: quiz.id, updatedAt: saved.updatedAt });
    assert.deepEqual(await store.history({ action: 'get', id: original.id }), original);
  } finally { await store?.close(); await rm(dir, { recursive: true, force: true }); }
});
