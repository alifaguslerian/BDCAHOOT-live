import type { OptionId, QuizQuestion } from './quiz';

export type GameStage = 
  | 'LOBBY' 
  | 'QUESTION' 
  | 'REVEAL' 
  | 'SCOREBOARD' 
  | 'FINAL';

export interface PlayerAnswer {
  questionIndex: number;
  selectedOption: OptionId;
  serverReceivedAtMs: number;
  responseDurationMs: number; // Server-measured response duration (ms)
  isCorrect: boolean;
  speedBonus: number; // Integer max(1, round(bonus_raw))
  pointsEarned: number; // 0 or (1000 + speedBonus)
}

export interface Player {
  id: string;
  name: string; // Sanitized uppercase/trimmed A-Z
  joinedAt: number;
  connected: boolean;
  score: number;
  totalResponseTimeMs: number; // Sum of server-measured response time for tie-breaking
  answers: Record<number, PlayerAnswer>;
}

export interface OptionDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
}

export interface ScoreboardRankItem {
  playerId: string;
  name: string;
  score: number;
  rank: number;
  previousRank: number;
  rankDelta: number; // >0 means rose up (e.g. +3), <0 means dropped
  totalResponseTimeMs: number;
  isTopTen: boolean;
}

/**
 * Visual enrichment fields used for stage projector rendering and showcase views.
 */
export interface DisplayPlayerEnrichment {
  avatarColor?: string;
  borderColor?: string;
  streak?: number;
  streakText?: string;
  tag?: string;
  note?: string;
  accuracy?: string;
  avgSpeed?: string;
}

/**
 * Scoreboard player model conforming to canonical Player while including ranking and display enrichment.
 */
export interface ArenaScoreboardPlayer extends Player, DisplayPlayerEnrichment {
  rank: number;
  rankDelta: number;
  rankDeltaText: string;
}

export interface GameRoomSettings {
  shuffleQuestions: boolean;
  revealDurationMs: number; // 3000 to 5000 ms
}

export interface GameRoom {
  code: string; // e.g. BDA729
  quizId: string;
  quizTitle: string;
  hostSessionId: string;
  stage: GameStage;
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  settings: GameRoomSettings;
  questionStartedAtMs: number | null;
  questionEndsAtMs: number | null; // Absolute server timestamp
  players: Record<string, Player>;
  createdAt: number;
  updatedAt: number;
}
