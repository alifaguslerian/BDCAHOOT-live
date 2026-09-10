'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import type { GameStage, GameRoom, Player, GameRoomSettings } from '@/types/game';
import type { QuizQuestion, OptionId, Quiz } from '@/types/quiz';
import { calculateQuestionPoints, calculateRankings } from '@/lib/scoring';
import { validatePlayerName, validateQuiz } from '@/lib/validation';
import { REVEAL_DURATION_MS, DEFAULT_TIMER_SECONDS } from '@/lib/constants';

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
  // Helpers
  currentQuestion: QuizQuestion | null;
  distribution: { A: number; B: number; C: number; D: number };
  rankings: ReturnType<typeof calculateRankings>;
}

function createInitialRoom(): GameRoom {
  const baseTime = 1772840000000; // Deterministic static timestamp for initial mock state
  return {
    code: 'BDA729',
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

  const currentQuestion = useMemo(() => {
    if (room.stage === 'LOBBY' || room.stage === 'FINAL') return null;
    return room.questions[room.currentQuestionIndex] ?? null;
  }, [room.stage, room.questions, room.currentQuestionIndex]);

  // Answer distribution calculation for Host Reveal screen
  const distribution = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    if (!currentQuestion) return counts;

    Object.values(room.players).forEach((p) => {
      const ans = p.answers[room.currentQuestionIndex];
      if (ans && ans.selectedOption in counts) {
        counts[ans.selectedOption]++;
      }
    });
    return counts;
  }, [room.players, room.currentQuestionIndex, currentQuestion]);

  const rankings = useMemo(() => {
    return calculateRankings(room.players);
  }, [room.players]);

  // HOST ACTION: Start Quiz
  const startQuiz = () => {
    const playerCount = Object.keys(room.players).length;
    if (playerCount === 0) {
      console.warn('START blocked: minimum 1 player required.');
      return;
    }

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
    }, 300); // Small debounce/delay to simulate network round-trip & prevent double-click
  };

  const finishQuiz = () => {
    setIsHostActionLoading(true);
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
    setRoom((prev) => ({
      ...prev,
      stage: newStage,
      updatedAt: Date.now(),
    }));
  };

  const resetRoom = () => {
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
    const code = 'BDA729';
    let questionsToUse = [...quiz.questions];
    if (customSettings?.shuffleQuestions) {
      questionsToUse = [...questionsToUse].sort(() => Math.random() - 0.5);
    }

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

    const newPlayerId = `p-${Date.now()}`;
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

  // PLAYER ACTION: Submit Answer (Only first submission accepted, speed bonus formula applied)
  const submitAnswer = (playerId: string, option: OptionId): { success: boolean; error?: string } => {
    const player = room.players[playerId];
    if (!player) return { success: false, error: 'Pemain tidak terdaftar.' };
    if (!currentQuestion) return { success: false, error: 'Tidak ada soal aktif.' };

    const qIdx = room.currentQuestionIndex;
    if (player.answers[qIdx]) {
      // Locked rule: second taps are silently ignored
      return { success: false, error: 'Jawaban sudah tercatat.' };
    }

    const now = Date.now();
    const startTime = room.questionStartedAtMs ?? now;
    const responseDurationMs = Math.max(0, now - startTime);
    const isCorrect = option === currentQuestion.correctOption;

    const { points, speedBonus } = calculateQuestionPoints(
      isCorrect,
      responseDurationMs,
      currentQuestion.timerSeconds
    );

    setRoom((prev) => {
      const p = prev.players[playerId];
      if (!p) return prev;

      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...p,
            score: p.score + points,
            totalResponseTimeMs: p.totalResponseTimeMs + responseDurationMs,
            answers: {
              ...p.answers,
              [qIdx]: {
                questionIndex: qIdx,
                selectedOption: option,
                serverReceivedAtMs: now,
                responseDurationMs,
                isCorrect,
                speedBonus,
                pointsEarned: points,
              },
            },
          },
        },
      };
    });

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
        currentQuestion,
        distribution,
        rankings,
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
