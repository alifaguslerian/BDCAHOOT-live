import type { Player, ScoreboardRankItem } from '@/types/game';

/**
 * Locked Scoring Formula (Section I):
 * e = t / T
 * bonus_raw  = B_max * e^(-k * e)
 * speedBonus = max(1, round(bonus_raw))
 * 
 * B_max = 1000
 * k     = 4
 * Correct   = 1000 (base) + speedBonus
 * Wrong     = 0
 * No answer = 0
 */
export const B_MAX = 1000;
export const K_FACTOR = 4;
export const BASE_CORRECT_SCORE = 1000;

export function calculateSpeedBonus(
  responseDurationMs: number,
  timerSeconds: number
): number {
  const totalTimerMs = timerSeconds * 1000;
  if (totalTimerMs <= 0) return 1;

  // Fraction of time elapsed: 0 <= e <= 1
  const e = Math.min(Math.max(responseDurationMs / totalTimerMs, 0), 1);
  const bonusRaw = B_MAX * Math.exp(-K_FACTOR * e);
  
  // Floor check must be applied AFTER round
  return Math.max(1, Math.round(bonusRaw));
}

export function calculateQuestionPoints(
  isCorrect: boolean,
  responseDurationMs: number,
  timerSeconds: number
): { points: number; speedBonus: number } {
  if (!isCorrect) {
    return { points: 0, speedBonus: 0 };
  }

  const speedBonus = calculateSpeedBonus(responseDurationMs, timerSeconds);
  const points = BASE_CORRECT_SCORE + speedBonus;

  return { points, speedBonus };
}

/**
 * Deterministic Tie-Breaking Ranking Hierarchy (Section I):
 * 1. Total score DESC
 * 2. Total server-measured response time ASC
 *    (sum of response times on answered questions + full T for unanswered questions)
 * 3. Server-assigned player sequence / player ID ASC (deterministic fallback)
 */
export function calculateRankings(
  players: Record<string, Player>,
  previousRanks?: Record<string, number>
): ScoreboardRankItem[] {
  const playerList = Object.values(players);

  playerList.sort((a, b) => {
    // 1. Total score DESC
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // 2. Total server-measured response time ASC
    if (a.totalResponseTimeMs !== b.totalResponseTimeMs) {
      return a.totalResponseTimeMs - b.totalResponseTimeMs;
    }

    // 3. Player ID / sequence ASC
    return a.id.localeCompare(b.id);
  });

  return playerList.map((player, index) => {
    const currentRank = index + 1;
    const prevRank = previousRanks?.[player.id] ?? currentRank;
    const rankDelta = prevRank - currentRank; // Positive = climbed up

    return {
      playerId: player.id,
      name: player.name,
      score: player.score,
      rank: currentRank,
      previousRank: prevRank,
      rankDelta,
      totalResponseTimeMs: player.totalResponseTimeMs,
      isTopTen: currentRank <= 10,
    };
  });
}
