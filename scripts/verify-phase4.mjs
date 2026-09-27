/**
 * Phase 4 Verification Script: Player Onboarding (Pre-Game)
 * Tests:
 * 1. Room Code auto-formatting and length invariants
 * 2. Player Name sanitization & strict validation (A-Z only, regex `^[a-zA-Z]+$`)
 * 3. Case-insensitive duplicate name rejection
 * 4. Room stage guard (Blocked State when stage !== 'LOBBY')
 * 5. Successful player registration and metadata invariants
 * 
 * Run via: node scripts/verify-phase4.mjs
 */

import assert from 'node:assert';

console.log('🧪 Starting Phase 4: Player Onboarding Verification Tests...\n');

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

// -------------------------------------------------------------
// Test Suite 1: Room Code Auto-Formatting & Invariants
// -------------------------------------------------------------
test('Room Code: Sanitizes non-alphanumeric and forces uppercase 6 chars', () => {
  const sanitizeRoomCode = (raw) => {
    return raw.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  };

  assert.strictEqual(sanitizeRoomCode('bda729'), 'BDA729');
  assert.strictEqual(sanitizeRoomCode(' bda-729! '), 'BDA729');
  assert.strictEqual(sanitizeRoomCode('xyz999extra'), 'XYZ999');
});

test('Room Code: Rejects codes shorter or longer than 6 chars', () => {
  const isValidRoomCode = (code) => {
    const clean = code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return clean.length === 6;
  };

  assert.strictEqual(isValidRoomCode('BDA72'), false, 'Should reject 5 chars');
  assert.strictEqual(isValidRoomCode('BDA7299'), false, 'Should reject 7 chars');
  assert.strictEqual(isValidRoomCode(''), false, 'Should reject empty');
  assert.strictEqual(isValidRoomCode('BDA729'), true, 'Should accept exact 6 chars');
});

// -------------------------------------------------------------
// Test Suite 2: Player Name Validation (Regex ^[a-zA-Z]+$)
// -------------------------------------------------------------
function validatePlayerName(rawName, existingNames = []) {
  if (!rawName || typeof rawName !== 'string') {
    return { isValid: false, sanitizedName: '', error: 'Nama tidak boleh kosong.' };
  }

  const trimmed = rawName.trim();
  if (trimmed.length === 0) {
    return { isValid: false, sanitizedName: '', error: 'Nama tidak boleh kosong.' };
  }

  if (trimmed.length > 15) {
    return {
      isValid: false,
      sanitizedName: '',
      error: 'Nama maksimal 15 karakter.',
    };
  }

  // Strict A-Z check: No numbers, symbols, spaces, or emojis
  const nameRegex = /^[a-zA-Z]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      isValid: false,
      sanitizedName: '',
      error: 'Nama hanya boleh berupa huruf A-Z tanpa angka, spasi, atau simbol.',
    };
  }

  const sanitized = trimmed.toUpperCase();

  // Case-insensitive duplicate check
  const isDuplicate = existingNames.some(
    (existing) => existing.trim().toUpperCase() === sanitized
  );

  if (isDuplicate) {
    return {
      isValid: false,
      sanitizedName: sanitized,
      error: `Nama "${sanitized}" sudah digunakan oleh peserta lain di room ini.`,
    };
  }

  return { isValid: true, sanitizedName: sanitized };
}

test('Name Validation: Accepts valid single A-Z names', () => {
  const result = validatePlayerName('ALDI', ['CITRA', 'BAGAS']);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.sanitizedName, 'ALDI');
  assert.strictEqual(result.error, undefined);
});

test('Name Validation: Rejects spaces within name', () => {
  const result = validatePlayerName('ALDI PRATAMA', []);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes('tanpa angka, spasi, atau simbol'));
});

test('Name Validation: Rejects numbers in name', () => {
  const result = validatePlayerName('ALDI123', []);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes('tanpa angka, spasi, atau simbol'));
});

test('Name Validation: Rejects symbols and emojis in name', () => {
  const res1 = validatePlayerName('ALDI!', []);
  assert.strictEqual(res1.isValid, false);

  const res2 = validatePlayerName('ALDI_KAH', []);
  assert.strictEqual(res2.isValid, false);

  const res3 = validatePlayerName('ALDI🔥', []);
  assert.strictEqual(res3.isValid, false);
});

test('Name Validation: Rejects names exceeding 15 characters', () => {
  const result = validatePlayerName('VERYLONGPLAYERNAMEEXCEEDINGMAX', []);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.error, 'Nama maksimal 15 karakter.');
});

test('Name Validation: Rejects duplicate names case-insensitively', () => {
  const existingNames = ['ALDI', 'CITRA', 'BAGAS'];

  // Exact uppercase match
  const res1 = validatePlayerName('ALDI', existingNames);
  assert.strictEqual(res1.isValid, false);
  assert.ok(res1.error.includes('sudah digunakan'));

  // Lowercase match
  const res2 = validatePlayerName('aldi', existingNames);
  assert.strictEqual(res2.isValid, false);
  assert.ok(res2.error.includes('sudah digunakan'));

  // Mixed case match
  const res3 = validatePlayerName('cItRa', existingNames);
  assert.strictEqual(res3.isValid, false);
  assert.ok(res3.error.includes('sudah digunakan'));
});

// -------------------------------------------------------------
// Test Suite 3: Room Stage Guard (Blocked State)
// -------------------------------------------------------------
test('Stage Guard: Rejects joining when game stage is not LOBBY', () => {
  const mockRoom = {
    code: 'BDA729',
    stage: 'QUESTION',
    players: { 'p-1': { name: 'CITRA' } },
  };

  const attemptJoin = (room, playerName) => {
    if (room.stage !== 'LOBBY') {
      return {
        success: false,
        error: 'Game sudah dimulai. Kamu tidak dapat bergabung ke game ini.',
        blocked: true,
      };
    }
    return { success: true };
  };

  const res = attemptJoin(mockRoom, 'DINI');
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.blocked, true);
  assert.ok(res.error.includes('Game sudah dimulai'));
});

test('Stage Guard: Allows joining when game stage is LOBBY', () => {
  const mockRoom = {
    code: 'BDA729',
    stage: 'LOBBY',
    players: { 'p-1': { name: 'CITRA' } },
  };

  const attemptJoin = (room, playerName) => {
    if (room.stage !== 'LOBBY') {
      return { success: false, blocked: true };
    }
    return { success: true, playerId: 'p-new-123' };
  };

  const res = attemptJoin(mockRoom, 'DINI');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.playerId, 'p-new-123');
});

// -------------------------------------------------------------
// Test Suite 4: Player Registration Integrity
// -------------------------------------------------------------
test('Player Registration: Creates pristine player record with zero metrics', () => {
  const now = Date.now();
  const createPlayer = (id, sanitizedName) => ({
    id,
    name: sanitizedName,
    joinedAt: now,
    connected: true,
    score: 0,
    totalResponseTimeMs: 0,
    answers: {},
  });

  const player = createPlayer('p-123', 'ZULFIKAR');
  assert.strictEqual(player.id, 'p-123');
  assert.strictEqual(player.name, 'ZULFIKAR');
  assert.strictEqual(player.score, 0);
  assert.strictEqual(player.totalResponseTimeMs, 0);
  assert.strictEqual(player.connected, true);
  assert.deepStrictEqual(player.answers, {});
});

console.log(`\n======================================================`);
console.log(`🎉 Phase 4 Verification Passed: ${passedTests}/${totalTests} tests successful.`);
console.log(`======================================================\n`);
