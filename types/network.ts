import type { GameRoomSettings, GameStage, Player, ScoreboardRankItem, OptionDistribution } from './game';
import type { Quiz, QuizQuestion, OptionId } from './quiz';
import type { LibraryRequest, LibraryResult } from './quizLibrary';

export type PublicQuestion = Omit<QuizQuestion, 'correctOption'> & { correctOption?: OptionId };
export interface RoomView {
  code: string;
  sessionId: string;
  revision: number;
  quizTitle: string;
  stage: GameStage;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PublicQuestion | null;
  settings: GameRoomSettings;
  countdownEndsAtMs?: number | null;
  questionStartedAtMs: number | null;
  questionEndsAtMs: number | null;
  revealEndsAtMs: number | null;
  players: Record<string, Player>;
  rankings: ScoreboardRankItem[];
  distribution: OptionDistribution;
  answeredCount: number;
  ownReceipt?: AnswerReceipt | null;
}
export interface SessionCredentials { code: string; sessionId: string; token: string; role: 'host' | 'player'; playerId?: string }
export interface AnswerReceipt { sessionId: string; questionIndex: number; submissionId: string; selectedOption: OptionId }
export type Reply<T = undefined> = { success: true; data: T } | { success: false; error: string; code?: string };
export interface SubmitRequest { sessionId: string; questionIndex: number; submissionId: string; option: OptionId }
export interface HostCommand { sessionId: string; revision: number; action: 'start' | 'next' | 'finish' | 'reveal' | 'scoreboard' | 'reset' | 'kick'; playerId?: string }
export interface ClientEvents {
  'host:recover': (payload: { code: string; hostKey: string }, ack: (reply: Reply<SessionCredentials>) => void) => void;
  'library:request': (payload: LibraryRequest & { hostKey: string }, ack: (reply: Reply<LibraryResult>) => void) => void;
  'room:leave': (payload: Record<string, never>, ack: (reply: Reply) => void) => void;
  'room:create': (payload: { quiz: Quiz; settings?: Partial<GameRoomSettings>; hostKey: string; requestId: string }, ack: (reply: Reply<SessionCredentials>) => void) => void;
  'room:inspect': (payload: { code: string }, ack: (reply: Reply<{ code: string; stage: GameStage }>) => void) => void;
  'room:join': (payload: { code: string; name: string; requestId: string; avatarId?: string }, ack: (reply: Reply<SessionCredentials>) => void) => void;
  'session:resume': (payload: SessionCredentials, ack: (reply: Reply<RoomView>) => void) => void;
  'answer:submit': (payload: SubmitRequest, ack: (reply: Reply<AnswerReceipt>) => void) => void;
  'host:command': (payload: HostCommand, ack: (reply: Reply<SessionCredentials | undefined>) => void) => void;
  'clock:ping': (payload: { sentAt: number }, ack: (reply: { receivedAt: number; sentAt: number }) => void) => void;
}
export interface ServerEvents {
  'room:state': (room: RoomView) => void;
  'room:count': (payload: { sessionId: string; questionIndex: number; count: number }) => void;
  'session:ended': (message: string, sessionId: string, playerId?: string) => void;
}
