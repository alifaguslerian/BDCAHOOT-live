'use client';

import React, { createContext, useContext, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { GameStage, GameRoom, Player, GameRoomSettings, PlayerAnswer } from '@/types/game';
import type { QuizQuestion, OptionId, Quiz } from '@/types/quiz';
import { calculateQuestionPoints, calculateRankings } from '@/lib/scoring';
import { validatePlayerName } from '@/lib/validation';
import {
  REVEAL_DURATION_MS,
  DEFAULT_TIMER_SECONDS,
  ANSWER_GRACE_PERIOD_MS,
  BATCH_FLUSH_INTERVAL_MS,
  DEFAULT_ROOM_CODE,
  generateRoomCode,
} from '@/lib/constants';

// Sample default question set for local testing
export const MOCK_DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Berapa jumlah pilar utama dalam sistem kemahasiswaan BDC?',
    options: [
      { id: 'A', text: '3 Pilar Utama' },
      { id: 'B', text: '4 Pilar Utama' },
      { id: 'C', text: '5 Pilar Utama' },
      { id: 'D', text: '6 Pilar Utama' },
    ],
    correctOption: 'B',
    timerSeconds: 15,
  },
  {
    id: 'q2',
    question: 'Tahun berapakah kampus pertama kali mengadakan Minigames Arena?',
    options: [
      { id: 'A', text: '2021' },
      { id: 'B', text: '2022' },
      { id: 'C', text: '2023' },
      { id: 'D', text: '2024' },
    ],
    correctOption: 'C',
    timerSeconds: 20,
  },
  {
    id: 'q3',
    question: 'Simbol bentuk geometri untuk pilihan opsi D pada sistem ini adalah?',
    options: [
      { id: 'A', text: 'Segitiga Merah' },
      { id: 'B', text: 'Diamond Biru' },
      { id: 'C', text: 'Lingkaran Kuning' },
      { id: 'D', text: 'Kotak Hijau' },
    ],
    correctOption: 'D',
    timerSeconds: 10,
  },
];

interface PendingAnswerRecord extends PlayerAnswer {
  playerId: string;
}

interface MockGameContextValue {
  room: GameRoom;
  currentPlayerId: string | null;
  setCurrentPlayerId: (id: string | null) => void;
  // Host Actions
  setStage: (stage: GameStage) => void;
  nextQuestion: () => void;
  startQuiz: () => void;
  finishQuiz: () => void;
  resetRoom: () => void;
  createRoomFromQuiz: (quiz: Quiz, customSettings?: Partial<GameRoomSettings>) => string;
  isHostActionLoading: boolean;
  // Player Actions
  joinRoomAsPlayer: (name: string) => { success: boolean; error?: string; playerId?: string };
  submitAnswer: (playerId: string, option: OptionId) => { success: boolean; error?: string };
  hasPlayerAnswered: (playerId: string) => boolean;
  getPlayerAnswer: (playerId: string, questionIndex?: number) => PlayerAnswer | null;
  // Helpers
  currentQuestion: QuizQuestion | null;
  distribution: { A: number; B: number; C: number; D: number };
  rankings: ReturnType<typeof calculateRankings>;
  answeredCount: number;
}

function createInitialRoom(): GameRoom {
  const baseTime = 1772840000000; // Deterministic static timestamp for initial mock state
  return {
    code: DEFAULT_ROOM_CODE,
    quizId: 'mock-quiz-1',
    quizTitle: 'BDCAHOOT Championship 2026',
    hostSessionId: 'host-session-123',
    stage: 'LOBBY',
    currentQuestionIndex: 0,
    questions: MOCK_DEFAULT_QUESTIONS,
    settings: {
      shuffleQuestions: false,
      revealDurationMs: REVEAL_DURATION_MS,
    },
    questionStartedAtMs: null,
    questionEndsAtMs: null,
    players: {
      'p-1': {
        id: 'p-1',
        name: 'ALDI',
        joinedAt: baseTime - 120000,
        connected: true,
        score: 0,
        totalResponseTimeMs: 0,
        answers: {},
      },
      'p-2': {
        id: 'p-2',
        name: 'CITRA',
        joinedAt: baseTime - 90000,
        connected: true,
        score: 0,
        totalResponseTimeMs: 0,
        answers: {},
      },
      'p-3': {
        id: 'p-3',
        name: 'BAGAS',
        joinedAt: baseTime - 40000,
        connected: true,
        score: 0,
        totalResponseTimeMs: 0,
        answers: {},
      },
    },
    createdAt: baseTime,
    updatedAt: baseTime,
  };
}

const MockGameContext = createContext<MockGameContextValue | null>(null);

export function MockGameProvider({ children }: { children: React.ReactNode }) {
  const [isHostActionLoading, setIsHostActionLoading] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const [room, setRoom] = useState<GameRoom>(createInitialRoom);

  // High-performance mutable answer store & batch queue (avoids 270KB deep clone per player tap)
  const pendingAnswersRef = useRef<Map<string, PendingAnswerRecord>>(new Map());
  const answersStoreRef = useRef<Map<string, Record<number, PlayerAnswer>>>(new Map());

  // Flush pending answers into the room state in a single atomic batch
  const flushPendingAnswers = useCallback(() => {
    if (pendingAnswersRef.current.size === 0) return;

    const batch = Array.from(pendingAnswersRef.current.values());
    pendingAnswersRef.current.clear();

    setRoom((prev) => {
      const nextPlayers = { ...prev.players };
      let hasChanges = false;

      for (const record of batch) {
        const p = nextPlayers[record.playerId];
        if (p && !p.answers[record.questionIndex]) {
          hasChanges = true;
          nextPlayers[record.playerId] = {
            ...p,
            score: p.score + record.pointsEarned,
            totalResponseTimeMs: p.totalResponseTimeMs + record.responseDurationMs,
            answers: {
              ...p.answers,
              [record.questionIndex]: {
                questionIndex: record.questionIndex,
                selectedOption: record.selectedOption,
                serverReceivedAtMs: record.serverReceivedAtMs,
                responseDurationMs: record.responseDurationMs,
                isCorrect: record.isCorrect,
                speedBonus: record.speedBonus,
                pointsEarned: record.pointsEarned,
              },
            },
          };
        }
      }

      if (!hasChanges) return prev;

      return {
        ...prev,
        players: nextPlayers,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // Periodic batch flush interval (300ms) to throttle React re-render cascades under 50+ concurrent taps
  useEffect(() => {
    const interval = setInterval(() => {
      flushPendingAnswers();
    }, BATCH_FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [flushPendingAnswers]);

  const currentQuestion = useMemo(() => {
    if (room.stage === 'LOBBY' || room.stage === 'FINAL') return null;
    return room.questions[room.currentQuestionIndex] ?? null;
  }, [room.stage, room.questions, room.currentQuestionIndex]);

  // Answer distribution calculation: Only recomputed on REVEAL, SCOREBOARD, or FINAL to save CPU
  const distribution = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    if (!currentQuestion) return counts;
    if (room.stage !== 'REVEAL' && room.stage !== 'SCOREBOARD' && room.stage !== 'FINAL') {
      return counts;
    }

    Object.values(room.players).forEach((p) => {
      const ans = p.answers[room.currentQuestionIndex];
      if (ans && ans.selectedOption in counts) {
        counts[ans.selectedOption]++;
      }
    });
    return counts;
  }, [room.stage, room.players, room.currentQuestionIndex, currentQuestion]);

  // Rankings: Only recomputed on SCOREBOARD, FINAL, and LOBBY (not recalculated 55x during QUESTION phase)
  const rankings = useMemo(() => {
    if (room.stage !== 'SCOREBOARD' && room.stage !== 'FINAL' && room.stage !== 'LOBBY') {
      return [];
    }
    return calculateRankings(room.players);
  }, [room.stage, room.players]);

  // Lightweight answered count for Host Screen during QUESTION stage
  const answeredCount = useMemo(() => {
    let count = 0;
    const qIdx = room.currentQuestionIndex;
    for (const p of Object.values(room.players)) {
      if (p.answers[qIdx]) count++;
    }
    return count;
  }, [room.players, room.currentQuestionIndex]);

  // Fast O(1) query whether a player has answered current question
  const hasPlayerAnswered = useCallback((playerId: string): boolean => {
    const qIdx = room.currentQuestionIndex;
    if (pendingAnswersRef.current.has(playerId)) {
      return pendingAnswersRef.current.get(playerId)!.questionIndex === qIdx;
    }
    const storeAnswers = answersStoreRef.current.get(playerId);
    if (storeAnswers && storeAnswers[qIdx]) {
      return true;
    }
    return Boolean(room.players[playerId]?.answers?.[qIdx]);
  }, [room.currentQuestionIndex, room.players]);

  // Fast query for player's answer record
  const getPlayerAnswer = useCallback((playerId: string, questionIndex?: number): PlayerAnswer | null => {
    const qIdx = questionIndex ?? room.currentQuestionIndex;
    if (pendingAnswersRef.current.has(playerId)) {
      const record = pendingAnswersRef.current.get(playerId)!;
      if (record.questionIndex === qIdx) return record;
    }
    const storeAnswers = answersStoreRef.current.get(playerId);
    if (storeAnswers && storeAnswers[qIdx]) {
      return storeAnswers[qIdx];
    }
    return room.players[playerId]?.answers?.[qIdx] ?? null;
  }, [room.currentQuestionIndex, room.players]);

  // HOST ACTION: Start Quiz
  const startQuiz = () => {
    const playerCount = Object.keys(room.players).length;
    if (playerCount === 0) {
      console.warn('START blocked: minimum 1 player required.');
      return;
    }

    flushPendingAnswers();

    const duration = room.questions[0]?.timerSeconds ?? DEFAULT_TIMER_SECONDS;
    const now = Date.now();

    setRoom((prev) => ({
      ...prev,
      stage: 'QUESTION',
      currentQuestionIndex: 0,
      questionStartedAtMs: now,
      questionEndsAtMs: now + duration * 1000,
      updatedAt: now,
    }));
  };

  // HOST ACTION: Next Question / Scoreboard -> Question
  const nextQuestion = () => {
    setIsHostActionLoading(true);
    flushPendingAnswers();

    setTimeout(() => {
      setRoom((prev) => {
        const nextIdx = prev.currentQuestionIndex + 1;
        if (nextIdx >= prev.questions.length) {
          return {
            ...prev,
            stage: 'FINAL',
            updatedAt: Date.now(),
          };
        }

        const duration = prev.questions[nextIdx]?.timerSeconds ?? DEFAULT_TIMER_SECONDS;
        const now = Date.now();
        return {
          ...prev,
          stage: 'QUESTION',
          currentQuestionIndex: nextIdx,
          questionStartedAtMs: now,
          questionEndsAtMs: now + duration * 1000,
          updatedAt: now,
        };
      });
      setIsHostActionLoading(false);
    }, 300);
  };

  const finishQuiz = () => {
    setIsHostActionLoading(true);
    flushPendingAnswers();

    setTimeout(() => {
      setRoom((prev) => ({
        ...prev,
        stage: 'FINAL',
        updatedAt: Date.now(),
      }));
      setIsHostActionLoading(false);
    }, 300);
  };

  const setStage = (newStage: GameStage) => {
    // Synchronously flush all buffered answers prior to stage transition (e.g. into REVEAL)
    flushPendingAnswers();

    setRoom((prev) => ({
      ...prev,
      stage: newStage,
      updatedAt: Date.now(),
    }));
  };

  const resetRoom = () => {
    pendingAnswersRef.current.clear();
    answersStoreRef.current.clear();

    setRoom((prev) => ({
      ...prev,
      stage: 'LOBBY',
      currentQuestionIndex: 0,
      questionStartedAtMs: null,
      questionEndsAtMs: null,
      players: {},
      updatedAt: Date.now(),
    }));
  };

  const createRoomFromQuiz = (quiz: Quiz, customSettings?: Partial<GameRoomSettings>): string => {
    // Generate dynamic randomized room code (or fallback to custom override)
    const code = customSettings?.customRoomCode || generateRoomCode();
    let questionsToUse = [...quiz.questions];
    if (customSettings?.shuffleQuestions) {
      questionsToUse = [...questionsToUse].sort(() => Math.random() - 0.5);
    }

    pendingAnswersRef.current.clear();
    answersStoreRef.current.clear();

    const now = Date.now();
    setRoom({
      code,
      quizId: quiz.id,
      quizTitle: quiz.title,
      hostSessionId: `host-${now}`,
      stage: 'LOBBY',
      currentQuestionIndex: 0,
      questions: questionsToUse,
      settings: {
        shuffleQuestions: customSettings?.shuffleQuestions ?? false,
        revealDurationMs: customSettings?.revealDurationMs ?? REVEAL_DURATION_MS,
        customRoomCode: customSettings?.customRoomCode,
      },
      questionStartedAtMs: null,
      questionEndsAtMs: null,
      players: {
        'p-1': {
          id: 'p-1',
          name: 'ALDI',
          joinedAt: now - 120000,
          connected: true,
          score: 0,
          totalResponseTimeMs: 0,
          answers: {},
        },
        'p-2': {
          id: 'p-2',
          name: 'CITRA',
          joinedAt: now - 90000,
          connected: true,
          score: 0,
          totalResponseTimeMs: 0,
          answers: {},
        },
        'p-3': {
          id: 'p-3',
          name: 'BAGAS',
          joinedAt: now - 40000,
          connected: true,
          score: 0,
          totalResponseTimeMs: 0,
          answers: {},
        },
      },
      createdAt: now,
      updatedAt: now,
    });

    return code;
  };

  // PLAYER ACTION: Join Room with strict validation (A-Z only, case-insensitive uniqueness)
  const joinRoomAsPlayer = (name: string): { success: boolean; error?: string; playerId?: string } => {
    const existingNames = Object.values(room.players).map((p) => p.name);
    const validation = validatePlayerName(name, existingNames);

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    if (room.stage !== 'LOBBY') {
      return {
        success: false,
        error: 'Game sudah dimulai. Kamu tidak dapat bergabung ke game ini.',
      };
    }

    const newPlayerId = `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPlayer: Player = {
      id: newPlayerId,
      name: validation.sanitizedName.toUpperCase(),
      joinedAt: Date.now(),
      connected: true,
      score: 0,
      totalResponseTimeMs: 0,
      answers: {},
    };

    setRoom((prev) => ({
      ...prev,
      players: {
        ...prev.players,
        [newPlayerId]: newPlayer,
      },
      updatedAt: Date.now(),
    }));

    setCurrentPlayerId(newPlayerId);
    return { success: true, playerId: newPlayerId };
  };

  // PLAYER ACTION: Submit Answer with anti-cheat deadline & stage validation + batch buffer
  const submitAnswer = (playerId: string, option: OptionId): { success: boolean; error?: string } => {
    // 1. Stage verification: ONLY allowed in QUESTION stage
    if (room.stage !== 'QUESTION') {
      return { success: false, error: 'Bukan tahap menjawab (Game stage bukan QUESTION).' };
    }

    // 2. Anti-cheat & Network Late Packet Grace Period verification
    const now = Date.now();
    if (room.questionEndsAtMs && now > room.questionEndsAtMs + ANSWER_GRACE_PERIOD_MS) {
      return { success: false, error: 'Waktu menjawab telah habis (Late packet rejected).' };
    }

    const player = room.players[playerId];
    if (!player) return { success: false, error: 'Pemain tidak terdaftar.' };
    if (!currentQuestion) return { success: false, error: 'Tidak ada soal aktif.' };

    const qIdx = room.currentQuestionIndex;

    // 3. Invariant: First-submission locked (check pending buffer, local ref store, and state)
    if (
      pendingAnswersRef.current.has(playerId) ||
      answersStoreRef.current.get(playerId)?.[qIdx] ||
      player.answers[qIdx]
    ) {
      return { success: false, error: 'Jawaban sudah tercatat.' };
    }

    const startTime = room.questionStartedAtMs ?? now;
    const responseDurationMs = Math.max(0, now - startTime);
    const isCorrect = option === currentQuestion.correctOption;

    const { points, speedBonus } = calculateQuestionPoints(
      isCorrect,
      responseDurationMs,
      currentQuestion.timerSeconds
    );

    const answerRecord: PendingAnswerRecord = {
      playerId,
      questionIndex: qIdx,
      selectedOption: option,
      serverReceivedAtMs: now,
      responseDurationMs,
      isCorrect,
      speedBonus,
      pointsEarned: points,
    };

    // Store in fast O(1) memory
    if (!answersStoreRef.current.has(playerId)) {
      answersStoreRef.current.set(playerId, {});
    }
    answersStoreRef.current.get(playerId)![qIdx] = answerRecord;

    // Push to batching buffer (flushed every 300ms or immediately on stage change)
    pendingAnswersRef.current.set(playerId, answerRecord);

    return { success: true };
  };

  return (
    <MockGameContext.Provider
      value={{
        room,
        currentPlayerId,
        setCurrentPlayerId,
        setStage,
        nextQuestion,
        startQuiz,
        finishQuiz,
        resetRoom,
        createRoomFromQuiz,
        isHostActionLoading,
        joinRoomAsPlayer,
        submitAnswer,
        hasPlayerAnswered,
        getPlayerAnswer,
        currentQuestion,
        distribution,
        rankings,
        answeredCount,
      }}
    >
      {children}
    </MockGameContext.Provider>
  );
}

export function useMockGame() {
  const context = useContext(MockGameContext);
  if (!context) {
    throw new Error('useMockGame must be used within a MockGameProvider');
  }
  return context;
}
