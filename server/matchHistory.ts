import type { HistoryRequest, MatchResult } from '../types/matchHistory';
import type { Player, ScoreboardRankItem } from '../types/game';

const MATCH_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function parseHistoryRequest(value: unknown): HistoryRequest {
  if (!value || typeof value !== 'object') throw Error('Permintaan riwayat tidak valid.');
  const request = value as Record<string, unknown>;
  if (request.action === 'get' && typeof request.id === 'string' && MATCH_ID.test(request.id)) {
    return { action: 'get', id: request.id };
  }
  if (request.action === 'list') {
    const limit = request.limit ?? 20;
    if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 50) throw Error('Batas riwayat harus 1 sampai 50.');
    if (request.before === undefined) return { action: 'list', limit: limit as number };
    const cursor = request.before as Record<string, unknown> | null;
    if (cursor && typeof cursor.finishedAt === 'number' && Number.isFinite(cursor.finishedAt) && cursor.finishedAt >= 0
      && typeof cursor.id === 'string' && MATCH_ID.test(cursor.id)) {
      return { action: 'list', limit: limit as number, before: { finishedAt: cursor.finishedAt, id: cursor.id } };
    }
  }
  throw Error('Permintaan riwayat tidak valid.');
}

export function createMatchResult(room: {
  sessionId: string; quizId?: string | null; title: string; startedAt?: number;
  completedAt?: number; questions: unknown[]; players: Record<string, Player>; rankings: ScoreboardRankItem[];
}): MatchResult {
  return {
    schemaVersion: 1, id: room.sessionId, quizId: room.quizId ?? null, quizTitle: room.title,
    startedAt: room.startedAt!, finishedAt: room.completedAt!,
    questionCount: room.questions.length, participantCount: room.rankings.length,
    rankings: room.rankings.map(row => {
      const answers = Object.values(room.players[row.playerId].answers);
      const correct = answers.filter(answer => answer.isCorrect).length;
      return {
        playerId: row.playerId, name: row.name, avatarId: row.avatarId,
        rank: row.rank, score: row.score, totalResponseTimeMs: row.totalResponseTimeMs,
        correct, wrong: answers.length - correct, unanswered: room.questions.length - answers.length,
      };
    }),
  };
}
