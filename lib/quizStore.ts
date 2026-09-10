/**
 * Quiz Store - Manages persistent local quiz collections for Host Mode.
 * Backed by LocalStorage with fallback in-memory state and pre-seeded competition quizzes.
 */

import { Quiz, QuizQuestion } from '@/types/quiz';
import { MOCK_DEFAULT_QUESTIONS } from '@/context/MockGameContext';

const STORAGE_KEY = 'bdcahoot_quiz_library_v1';

export const PRESEEDED_QUIZZES: Quiz[] = [
  {
    id: 'championship-2026',
    title: 'BDCAHOOT Championship 2026',
    questions: MOCK_DEFAULT_QUESTIONS,
    createdAt: 1772840000000 - 86400000 * 3,
    updatedAt: 1772840000000 - 86400000,
  },
  {
    id: 'web-architecture',
    title: 'Web Architecture & Frontend Trivia',
    questions: [
      {
        id: 'wa-1',
        question: 'Manakah framework CSS yang mengutamakan pendekatan utility-first?',
        options: [
          { id: 'A', text: 'Tailwind CSS' },
          { id: 'B', text: 'Bootstrap' },
          { id: 'C', text: 'Bulma CSS' },
          { id: 'D', text: 'Foundation' },
        ],
        correctOption: 'A',
        timerSeconds: 15,
      },
      {
        id: 'wa-2',
        question: 'Protokol komunikasi real-time full-duplex dua arah melalui satu koneksi TCP persisten adalah?',
        options: [
          { id: 'A', text: 'WebSockets' },
          { id: 'B', text: 'HTTP Long Polling' },
          { id: 'C', text: 'Server-Sent Events (SSE)' },
          { id: 'D', text: 'DNS Round Robin' },
        ],
        correctOption: 'A',
        timerSeconds: 20,
      },
      {
        id: 'wa-3',
        question: 'Berapa durasi minimum recommended untuk reveal phase kuis arena?',
        options: [
          { id: 'A', text: '1 detik' },
          { id: 'B', text: '3 sampai 5 detik' },
          { id: 'C', text: '15 detik' },
          { id: 'D', text: '30 detik' },
        ],
        correctOption: 'B',
        timerSeconds: 15,
      },
    ],
    createdAt: 1772840000000 - 86400000 * 2,
    updatedAt: 1772840000000 - 3600000,
  },
  {
    id: 'draft-baru',
    title: 'Draft Kuis Kampus (Belum Selesai)',
    questions: [
      {
        id: 'd-1',
        question: 'Apa kepanjangan dari BDC?',
        options: [
          { id: 'A', text: 'Bandung Developer Club' },
          { id: 'B', text: '' }, // Incomplete option text intentionally
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ],
        correctOption: 'A',
        timerSeconds: 20,
      },
    ],
    createdAt: 1772840000000 - 1800000,
    updatedAt: 1772840000000 - 600000,
  },
];

let inMemoryQuizzes: Quiz[] = [...PRESEEDED_QUIZZES];

export function getStoredQuizzes(): Quiz[] {
  if (typeof window === 'undefined') {
    return inMemoryQuizzes;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESEEDED_QUIZZES));
      return PRESEEDED_QUIZZES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return PRESEEDED_QUIZZES;
  } catch {
    return inMemoryQuizzes;
  }
}

export function getQuizById(id: string): Quiz | null {
  const list = getStoredQuizzes();
  return list.find((q) => q.id === id) || null;
}

export function saveQuiz(quiz: Quiz): void {
  const current = getStoredQuizzes();
  const existingIdx = current.findIndex((q) => q.id === quiz.id);
  let updatedList: Quiz[];

  const updatedQuiz: Quiz = {
    ...quiz,
    updatedAt: typeof window !== 'undefined' ? Date.now() : 1772840000000,
  };

  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedQuiz;
  } else {
    updatedList = [updatedQuiz, ...current];
  }

  inMemoryQuizzes = updatedList;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new Event('bdcahoot:quizzes-changed'));
    } catch {
      // Storage quota or unavailable
    }
  }
}

export function deleteQuiz(id: string): void {
  const current = getStoredQuizzes();
  const updatedList = current.filter((q) => q.id !== id);
  inMemoryQuizzes = updatedList;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new Event('bdcahoot:quizzes-changed'));
    } catch {
      // Storage unavailable
    }
  }
}

export function createNewQuestion(indexNumber: number): QuizQuestion {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    question: `Pertanyaan Nomor ${indexNumber}`,
    options: [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
    ],
    correctOption: 'A',
    timerSeconds: 20,
  };
}

export function createNewDraftQuiz(): Quiz {
  const id = `quiz-${Date.now().toString(36)}`;
  const now = typeof window !== 'undefined' ? Date.now() : 1772840000000;
  return {
    id,
    title: 'Kuis Arena Baru',
    questions: [
      {
        id: `q-${now}-1`,
        question: 'Tuliskan pertanyaan pertama di sini...',
        options: [
          { id: 'A', text: 'Pilihan Jawaban A' },
          { id: 'B', text: 'Pilihan Jawaban B' },
          { id: 'C', text: 'Pilihan Jawaban C' },
          { id: 'D', text: 'Pilihan Jawaban D' },
        ],
        correctOption: 'A',
        timerSeconds: 20,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
