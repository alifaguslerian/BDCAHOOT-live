import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCsv, matchFilename } from '../lib/matchCsv';
import type { MatchResult } from '../types/matchHistory';

const result: MatchResult = { schemaVersion: 1, id: '00112233-4455-6677-8899-aabbccddeeff', quizId: 'q',
  quizTitle: '=HYPERLINK("evil")\nQuiz, ü', startedAt: 1_800_000_000_000, finishedAt: 1_800_000_010_000,
  questionCount: 2, participantCount: 2, rankings: [
    { playerId: 'p1', rank: 1, name: 'ANA', score: 2000, totalResponseTimeMs: 5000, correct: 1, wrong: 0, unanswered: 1 },
    { playerId: 'p2', rank: 2, name: '+BOB', score: 0, totalResponseTimeMs: 9000, correct: 0, wrong: 2, unanswered: 0 },
  ] };

test('CSV exports all server ranks and totals with UTF-8 BOM, escaping and spreadsheet formula protection', () => {
  const csv = matchCsv(result);
  assert(csv.startsWith('\uFEFF'));
  assert(csv.includes('"Peringkat","Nama","Poin","Benar","Salah","Tidak dijawab","Total waktu respons (ms)"'));
  assert(csv.includes('"1","ANA","2000","1","0","1","5000"\r\n'));
  assert(csv.includes('"2","\'+BOB","0","0","2","0","9000"\r\n'));
  assert(csv.includes('"\'=HYPERLINK(""evil"")\nQuiz, ü"'));
  assert(csv.includes(result.id));
  assert(!csv.includes('p1'));
});

test('download names cannot contain paths and distinguish repeated quiz sessions', () => {
  const name = matchFilename({ ...result, quizTitle: '../evil\\file:*?<>|' });
  assert(!/[\\/:*?"<>|]/.test(name));
  assert(name.endsWith('-00112233.csv'));
  assert.notEqual(matchFilename(result), matchFilename({ ...result, id: 'ffeeddcc-4455-6677-8899-aabbccddeeff' }));
});
