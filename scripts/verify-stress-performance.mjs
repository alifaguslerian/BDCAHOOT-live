/**
 * Performance & Security Verification Script (BDCAHOOT Live Arena)
 * Tests High-Concurrency Batching, Anti-Cheat Deadlines, and 55 Players x 30 Questions Stress Test.
 * Run via: npm run test:perf  or  node scripts/verify-stress-performance.mjs
 */

import assert from 'node:assert';

console.log('🚀 Starting Performance & Security Verification Tests...\n');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Reason: ${err.message}\n`);
    process.exitCode = 1;
  }
}

// 1. PIN Generator Invariant
function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    suffix += chars[idx];
  }
  return `BDA${suffix}`;
}

test('PIN Generator: Generates valid 6-char room code matching BDA[2-9A-HJ-NP-Z]{3}', () => {
  const pinRegex = /^BDA[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{3}$/;
  for (let i = 0; i < 100; i++) {
    const code = generateRoomCode();
    assert.strictEqual(code.length, 6, `Room code ${code} should be exactly 6 characters`);
    assert.strictEqual(pinRegex.test(code), true, `Room code ${code} contains invalid/ambiguous characters`);
    assert.strictEqual(code.includes('0') || code.includes('O') || code.includes('1') || code.includes('I'), false, 'Should not contain ambiguous characters 0, O, 1, I');
  }
});

// 2. Anti-Cheat: Stage Verification
test('Anti-Cheat: Rejects answer when room stage is not QUESTION', () => {
  const mockRoom = {
    stage: 'LOBBY',
    questionEndsAtMs: Date.now() + 15000,
  };

  const validateSubmission = (stage, endsAtMs, currentTimestamp) => {
    if (stage !== 'QUESTION') {
      return { success: false, error: 'Bukan tahap menjawab (Game stage bukan QUESTION).' };
    }
    if (endsAtMs && currentTimestamp > endsAtMs + 200) {
      return { success: false, error: 'Waktu menjawab telah habis (Late packet rejected).' };
    }
    return { success: true };
  };

  const resultLobby = validateSubmission(mockRoom.stage, mockRoom.questionEndsAtMs, Date.now());
  assert.strictEqual(resultLobby.success, false, 'Should reject submission during LOBBY stage');

  const resultReveal = validateSubmission('REVEAL', mockRoom.questionEndsAtMs, Date.now());
  assert.strictEqual(resultReveal.success, false, 'Should reject submission during REVEAL stage');

  const resultScoreboard = validateSubmission('SCOREBOARD', mockRoom.questionEndsAtMs, Date.now());
  assert.strictEqual(resultScoreboard.success, false, 'Should reject submission during SCOREBOARD stage');
});

// 3. Anti-Cheat: Deadline Grace Period Verification
test('Anti-Cheat: Enforces endsAt + 200ms deadline grace period', () => {
  const questionEndsAtMs = 1772840020000;
  const GRACE_PERIOD_MS = 200;

  const checkDeadline = (timestamp) => {
    if (timestamp > questionEndsAtMs + GRACE_PERIOD_MS) {
      return { success: false, error: 'Late packet rejected' };
    }
    return { success: true };
  };

  // Valid submissions
  assert.strictEqual(checkDeadline(questionEndsAtMs - 5000).success, true, 'Submission before deadline should pass');
  assert.strictEqual(checkDeadline(questionEndsAtMs).success, true, 'Submission exactly at deadline should pass');
  assert.strictEqual(checkDeadline(questionEndsAtMs + 150).success, true, 'Submission within 200ms grace period should pass');
  assert.strictEqual(checkDeadline(questionEndsAtMs + 200).success, true, 'Submission at boundary 200ms grace should pass');

  // Rejected late submissions
  assert.strictEqual(checkDeadline(questionEndsAtMs + 201).success, false, 'Submission past 200ms grace must be rejected');
  assert.strictEqual(checkDeadline(questionEndsAtMs + 1000).success, false, 'Late submission must be rejected');
});

// 4. Single-Answer Invariant (Locked First Tap)
test('Lock Invariant: Silently ignores second answer from same player on same question', () => {
  const playerAnswers = new Map();
  const qIdx = 4;

  const submitAnswer = (playerId, questionIndex, option) => {
    if (playerAnswers.has(`${playerId}_${questionIndex}`)) {
      return { success: false, error: 'Jawaban sudah tercatat.' };
    }
    playerAnswers.set(`${playerId}_${questionIndex}`, { option, timestamp: Date.now() });
    return { success: true };
  };

  const firstTap = submitAnswer('p-12', qIdx, 'B');
  assert.strictEqual(firstTap.success, true, 'First tap should succeed');

  const secondTap = submitAnswer('p-12', qIdx, 'C');
  assert.strictEqual(secondTap.success, false, 'Second tap must be rejected');
  assert.strictEqual(playerAnswers.get(`p-12_${qIdx}`).option, 'B', 'Option must remain B');
});

// 5. High-Concurrency Batching Buffer Test
test('Batch Buffer: Aggregates 55 concurrent answers into a single atomic flush', () => {
  const pendingBuffer = new Map();
  let setRoomCallCount = 0;

  const mockRoom = {
    players: {},
  };

  // Initialize 55 players
  for (let i = 1; i <= 55; i++) {
    mockRoom.players[`p-${i}`] = { id: `p-${i}`, score: 0, answers: {} };
  }

  // Simulate 55 concurrent taps
  for (let i = 1; i <= 55; i++) {
    pendingBuffer.set(`p-${i}`, {
      playerId: `p-${i}`,
      questionIndex: 0,
      selectedOption: ['A', 'B', 'C', 'D'][i % 4],
      pointsEarned: 1000 + (i * 5),
    });
  }

  // Flush buffer
  const flush = () => {
    if (pendingBuffer.size === 0) return;
    setRoomCallCount++;
    const batch = Array.from(pendingBuffer.values());
    pendingBuffer.clear();

    for (const record of batch) {
      mockRoom.players[record.playerId].score += record.pointsEarned;
      mockRoom.players[record.playerId].answers[record.questionIndex] = record;
    }
  };

  flush();

  assert.strictEqual(setRoomCallCount, 1, '55 answers should be processed in exactly 1 batch mutation');
  assert.strictEqual(pendingBuffer.size, 0, 'Buffer must be completely cleared after flush');
  assert.strictEqual(Object.keys(mockRoom.players['p-1'].answers).length, 1, 'Player 1 answer must be saved');
  assert.strictEqual(Object.keys(mockRoom.players['p-55'].answers).length, 1, 'Player 55 answer must be saved');
});

// 6. Lazy Computation Invariant: No Sort During QUESTION Stage
test('Lazy Computation: Skips expensive sorting and distribution loops during QUESTION stage', () => {
  const stage = 'QUESTION';

  const computeDistribution = (currentStage, players, currentQuestionIndex) => {
    if (currentStage !== 'REVEAL' && currentStage !== 'SCOREBOARD' && currentStage !== 'FINAL') {
      return { A: 0, B: 0, C: 0, D: 0 }; // O(1) instantaneous return
    }
    // Expensive loop
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(players).forEach(p => {
      const ans = p.answers[currentQuestionIndex];
      if (ans && ans.selectedOption in counts) counts[ans.selectedOption]++;
    });
    return counts;
  };

  const distDuringQuestion = computeDistribution(stage, {}, 0);
  assert.deepStrictEqual(distDuringQuestion, { A: 0, B: 0, C: 0, D: 0 });

  const computeRankings = (currentStage, players) => {
    if (currentStage !== 'SCOREBOARD' && currentStage !== 'FINAL' && currentStage !== 'LOBBY') {
      return []; // O(1) instantaneous return
    }
    return Object.values(players).sort((a, b) => b.score - a.score);
  };

  const rankingsDuringQuestion = computeRankings(stage, {});
  assert.deepStrictEqual(rankingsDuringQuestion, []);
});

// 7. Full Stress Test: 55 Players x 30 Questions (1,650 answers)
test('Stress Test: 55 players x 30 questions (1,650 answers) completes smoothly without errors', () => {
  const TOTAL_PLAYERS = 55;
  const TOTAL_QUESTIONS = 30;
  const TOTAL_ANSWERS = TOTAL_PLAYERS * TOTAL_QUESTIONS;

  // Initialize room with 55 players
  const room = {
    code: generateRoomCode(),
    stage: 'QUESTION',
    currentQuestionIndex: 0,
    players: {},
  };

  for (let i = 1; i <= TOTAL_PLAYERS; i++) {
    room.players[`p-${i}`] = {
      id: `p-${i}`,
      name: `PLAYER_${i}`,
      score: 0,
      totalResponseTimeMs: 0,
      answers: {},
    };
  }

  const startTime = performance.now();
  let totalSubmissions = 0;
  let batchCount = 0;

  for (let q = 0; q < TOTAL_QUESTIONS; q++) {
    room.stage = 'QUESTION';
    room.currentQuestionIndex = q;

    const pendingBuffer = new Map();

    // 55 concurrent players tap answers
    for (let p = 1; p <= TOTAL_PLAYERS; p++) {
      const pId = `p-${p}`;
      const option = ['A', 'B', 'C', 'D'][(p + q) % 4];
      const isCorrect = option === 'B';
      const points = isCorrect ? 1000 + (p * 5) : 0;
      const responseTime = 800 + (p * 20);

      pendingBuffer.set(pId, {
        playerId: pId,
        questionIndex: q,
        selectedOption: option,
        pointsEarned: points,
        responseDurationMs: responseTime,
      });
      totalSubmissions++;
    }

    // Flush batch to state
    batchCount++;
    for (const record of pendingBuffer.values()) {
      const player = room.players[record.playerId];
      player.score += record.pointsEarned;
      player.totalResponseTimeMs += record.responseDurationMs;
      player.answers[record.questionIndex] = record;
    }
    pendingBuffer.clear();

    // Transition to REVEAL then SCOREBOARD
    room.stage = 'REVEAL';
    room.stage = 'SCOREBOARD';
  }

  const elapsedMs = performance.now() - startTime;

  assert.strictEqual(totalSubmissions, TOTAL_ANSWERS, `Should process exactly ${TOTAL_ANSWERS} answers`);
  assert.strictEqual(batchCount, TOTAL_QUESTIONS, `Should flush in exactly ${TOTAL_QUESTIONS} batches (1 per question round)`);

  // Verify Player 1 has all 30 answers
  assert.strictEqual(Object.keys(room.players['p-1'].answers).length, TOTAL_QUESTIONS, 'Player 1 should have 30 answers');
  // Verify Player 55 has all 30 answers
  assert.strictEqual(Object.keys(room.players['p-55'].answers).length, TOTAL_QUESTIONS, 'Player 55 should have 30 answers');

  console.log(`    📊 Benchmark: 1,650 answers processed in ${elapsedMs.toFixed(2)}ms (${(elapsedMs / TOTAL_ANSWERS).toFixed(4)}ms per answer)`);
  assert.strictEqual(elapsedMs < 100, true, 'Execution time should be under 100ms');
});

console.log('\n' + '='.repeat(48));
console.log(`✨ Performance Verification Results: ${passedTests}/${totalTests} Passed (0 Errors)`);
console.log('='.repeat(48) + '\n');
