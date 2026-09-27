/**
 * Lean Event Contracts for High-Concurrency (50-100+ Players) Multiplayer
 * Eliminates O(N^2) payload broadcast floods by strictly isolating
 * minimal player-facing events from massive server/host state trees.
 */

import type { OptionId } from '@/types/quiz';
import type { GameStage } from '@/types/game';

// 1. Client -> Server: Submit Answer Packet (Tightly packed: ~60 bytes vs 50KB room clone)
export interface ClientSubmitAnswerPacket {
  type: 'CLIENT_SUBMIT_ANSWER';
  playerId: string;
  questionIndex: number;
  selectedOption: OptionId;
  clientSentAtMs: number;
}

// 2. Server -> Client: Direct Unicast Submission Ack (Only returned to submitting client: ~40 bytes)
export interface ServerSubmitAckPacket {
  type: 'SERVER_SUBMIT_ACK';
  success: boolean;
  locked: boolean;
  questionIndex: number;
  serverReceivedAtMs: number;
  error?: string;
}

// 3. Server -> All Clients Broadcast: Lean Stage Transition Packet (~80 bytes)
// Notice: Contains ZERO other players' answers or scores. Avoids O(N^2) broadcast explosion!
export interface ServerStageBroadcastPacket {
  type: 'SERVER_STAGE_TRANSITION';
  stage: GameStage;
  currentQuestionIndex: number;
  totalQuestions: number;
  timerSeconds?: number;
  questionStartedAtMs?: number | null;
  questionEndsAtMs?: number | null;
  serverTimestampMs: number;
}

// 4. Server -> Client Unicast: Private Round Result (~90 bytes, sent privately to individual socket)
export interface ServerPrivatePlayerResultPacket {
  type: 'SERVER_PRIVATE_RESULT';
  playerId: string;
  questionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  speedBonus: number;
  totalScore: number;
  currentRank: number;
  previousRank: number;
  rankDelta: number;
  totalPlayers: number;
}

// 5. Host Projector Live Answer Counter Update (~30 bytes, host socket only)
export interface HostAnswerCountUpdatePacket {
  type: 'HOST_ANSWER_COUNT_UPDATE';
  questionIndex: number;
  answeredCount: number;
  totalPlayers: number;
}
