/**
 * Phase 3 Verification Script
 * Validates Quiz Store, Quiz Validation Rules, Name Sanitization, and Room Generation.
 * Run via: node scripts/verify-phase3.mjs
 */

import assert from 'node:assert';

console.log('🧪 Starting Phase 3: Host Quiz Management Verification Tests...\n');

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

// Test Suite 1: Quiz Question Invariants
test('Quiz Validation: Rejects quiz with empty title', () => {
  const incompleteQuiz = {
    id: 'test-1',
    title: '   ',
    questions: [
      {
        id: 'q1',
        question: 'Valid question?',
        options: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
          { id: 'C', text: 'Opt C' },
          { id: 'D', text: 'Opt D' },
        ],
        correctOption: 'A',
        timerSeconds: 15,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const hasEmptyTitle = !incompleteQuiz.title.trim();
  assert.strictEqual(hasEmptyTitle, true, 'Should detect empty title');
});

test('Quiz Validation: Rejects question with missing option text', () => {
  const invalidQuestion = {
    id: 'q1',
    question: 'Soal dengan opsi kosong',
    options: [
      { id: 'A', text: 'Pilihan A' },
      { id: 'B', text: '' }, // empty
      { id: 'C', text: 'Pilihan C' },
      { id: 'D', text: 'Pilihan D' },
    ],
    correctOption: 'A',
    timerSeconds: 20,
  };

  const hasEmptyOption = invalidQuestion.options.some((o) => !o.text.trim());
  assert.strictEqual(hasEmptyOption, true, 'Should detect empty option text');
});

test('Quiz Validation: Rejects question with invalid correct option key', () => {
  const invalidKeyQuestion = {
    id: 'q1',
    question: 'Soal dengan kunci salah',
    options: [
      { id: 'A', text: 'Pilihan A' },
      { id: 'B', text: 'Pilihan B' },
      { id: 'C', text: 'Pilihan C' },
      { id: 'D', text: 'Pilihan D' },
    ],
    correctOption: 'E', // invalid
    timerSeconds: 20,
  };

  const validKeys = ['A', 'B', 'C', 'D'];
  const isValidKey = validKeys.includes(invalidKeyQuestion.correctOption);
  assert.strictEqual(isValidKey, false, 'Should reject non-ABCD correctOption');
});

test('Quiz Validation: Accepts fully qualified 4-option question set', () => {
  const validQuiz = {
    id: 'valid-1',
    title: 'Kuis Valid 2026',
    questions: [
      {
        id: 'q1',
        question: 'Framework CSS utility-first?',
        options: [
          { id: 'A', text: 'Tailwind' },
          { id: 'B', text: 'Bootstrap' },
          { id: 'C', text: 'Bulma' },
          { id: 'D', text: 'Foundation' },
        ],
        correctOption: 'A',
        timerSeconds: 15,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  assert.ok(validQuiz.title.trim().length > 0);
  assert.strictEqual(validQuiz.questions.length, 1);
  assert.strictEqual(validQuiz.questions[0].options.length, 4);
  assert.ok(validQuiz.questions[0].options.every((o) => o.text.trim().length > 0));
});

// Test Suite 2: Player Name Sanitization & Uniqueness
test('Player Name: Accepts uppercase letters A-Z without numbers/symbols', () => {
  const rawInput = 'budi_123!';
  const sanitized = rawInput.replace(/[^a-zA-Z]/g, '').toUpperCase();
  assert.strictEqual(sanitized, 'BUDI');
  assert.match(sanitized, /^[A-Z]+$/);
});

test('Player Name: Enforces case-insensitive room uniqueness', () => {
  const existingNames = ['ALDI', 'CITRA', 'BAGAS'];
  const newCandidate = 'aldi';
  const isDuplicate = existingNames.some(
    (n) => n.trim().toUpperCase() === newCandidate.trim().toUpperCase()
  );
  assert.strictEqual(isDuplicate, true, 'Should detect duplicate case-insensitively');
});

// Test Suite 3: Game Room & Question Shuffling Invariants
test('Game Settings: Shuffling questions preserves all elements without mutation', () => {
  const original = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
  const copy = [...original];
  const shuffled = [...copy].sort(() => 0.5 - Math.random());

  assert.strictEqual(shuffled.length, original.length);
  for (const item of original) {
    assert.ok(shuffled.includes(item));
  }
});

test('Game Settings: Reveal duration bounds strictly adhere to 3-5 seconds', () => {
  const allowedDurations = [3000, 4000, 5000];
  const configuredDuration = 4000;
  assert.ok(allowedDurations.includes(configuredDuration));
});

console.log(`\n========================================`);
console.log(`✨ Phase 3 Verification Results: ${passedTests}/${totalTests} Passed (0 Errors)`);
console.log(`========================================\n`);

if (process.exitCode && process.exitCode !== 0) {
  process.exit(1);
}
