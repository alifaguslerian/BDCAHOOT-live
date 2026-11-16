export interface MatchSummary {
  id: string;
  quizId: string | null;
  quizTitle: string;
  startedAt: number;
  finishedAt: number;
  questionCount: number;
  participantCount: number;
}

export interface MatchRanking {
  playerId: string;
  name: string;
  avatarId?: string;
  rank: number;
  score: number;
  totalResponseTimeMs: number;
  correct: number;
  wrong: number;
  unanswered: number;
}

export interface MatchResult extends MatchSummary {
  schemaVersion: 1;
  rankings: MatchRanking[];
}

export interface MatchCursor { finishedAt: number; id: string }
export interface MatchPage { items: MatchSummary[]; nextCursor: MatchCursor | null }
export type HistoryRequest =
  | { action: 'list'; limit?: number; before?: MatchCursor }
  | { action: 'get'; id: string };
export type HistoryResponse = MatchPage | MatchResult | null;
