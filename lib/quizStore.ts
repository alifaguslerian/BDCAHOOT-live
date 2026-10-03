import { Quiz, QuizQuestion } from '@/types/quiz';

const STORAGE_KEY = 'bdcahoot_quiz_library_v1';
let inMemoryQuizzes: Quiz[] = [];

export function getStoredQuizzes(): Quiz[] {
  if (typeof window === 'undefined') {
    return inMemoryQuizzes;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return inMemoryQuizzes;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return inMemoryQuizzes;
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
