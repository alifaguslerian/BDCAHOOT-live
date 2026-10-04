import { Quiz, QuizQuestion } from '@/types/quiz';
import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, Reply } from '@/types/network';
import type { LibraryRequest, LibraryResult } from '@/types/quizLibrary';

const STORAGE_KEY = 'bdcahoot_quiz_library_v1';
const OPERATOR_KEY = 'bdcahoot_library_operator';
let quizzes: Quiz[] = [];
let socket: Socket<ServerEvents, ClientEvents> | undefined;
let operatorKey = '';

export function getOperatorKey(): string {
  try { return sessionStorage.getItem(OPERATOR_KEY) || ''; } catch { return operatorKey; }
}
export function disconnectQuizLibrary() {
  socket?.disconnect(); socket = undefined; operatorKey = ''; quizzes = [];
}
async function request(payload: LibraryRequest): Promise<LibraryResult> {
  if (!socket) throw Error('Server belum terhubung. Perubahan belum tersimpan.');
  const connection = socket;
  if (!connection.connected) await waitForConnection(connection);
  let reply: Reply<LibraryResult>;
  try { reply = await connection.timeout(7000).emitWithAck('library:request', { ...payload, hostKey: operatorKey }); }
  catch { throw Error('Konfirmasi server belum diterima. Muat ulang sebelum mencoba lagi.'); }
  if (!reply.success) throw Error(reply.error);
  return reply.data;
}
function waitForConnection(connection: Socket<ServerEvents, ClientEvents>): Promise<void> {
  if (connection.connected) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); connection.off('connect', connected); };
    const connected = () => { cleanup(); resolve(); };
    const timer = setTimeout(() => { cleanup(); reject(Error('Server belum terhubung. Perubahan belum tersimpan. Coba lagi.')); }, 5000);
    connection.once('connect', connected);
    connection.connect();
  });
}
export async function connectQuizLibrary(key: string): Promise<void> {
  disconnectQuizLibrary();
  operatorKey = key;
  const connection: Socket<ServerEvents, ClientEvents> = io(window.location.origin, { autoConnect: false, forceNew: true });
  socket = connection;
  try {
    await waitForConnection(connection);
    await refreshQuizzes(); // Authenticate before reading or migrating browser data.
    let legacy: string | null = null;
    try { legacy = localStorage.getItem(STORAGE_KEY); } catch { /* Server storage works without browser storage. */ }
    if (legacy) {
      const entries: unknown = JSON.parse(legacy);
      if (!Array.isArray(entries)) throw Error('Data kuis lama tidak valid; salinan browser tetap disimpan.');
      for (const quiz of entries) await request({ action: 'import', quiz });
      await refreshQuizzes();
      try {
        localStorage.setItem(`${STORAGE_KEY}_backup`, legacy);
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* Import is idempotent if a browser cannot archive its old library. */ }
    }
    try { sessionStorage.setItem(OPERATOR_KEY, key); } catch { /* Keep credentials in memory for this tab. */ }
  } catch (error) { connection.disconnect(); if (socket === connection) disconnectQuizLibrary(); throw error; }
}
export async function refreshQuizzes(): Promise<void> {
  quizzes = await request({ action: 'list' }) as Quiz[];
  changed();
}
function changed() {
  if (typeof window !== 'undefined') window.dispatchEvent(new window.Event('bdcahoot:quizzes-changed'));
}
export function getStoredQuizzes(): Quiz[] { return quizzes; }
export function getQuizById(id: string): Quiz | null { return quizzes.find(q => q.id === id) ?? null; }
export async function loadQuiz(id: string): Promise<Quiz | null> {
  const quiz = await request({ action: 'get', id }) as Quiz | null;
  quizzes = quizzes.filter(q => q.id !== id);
  if (quiz) quizzes.unshift(quiz);
  return quiz;
}
export async function saveQuiz(quiz: Quiz): Promise<Quiz> {
  const saved = await request({ action: 'save', quiz }) as Quiz;
  quizzes = [saved, ...quizzes.filter(q => q.id !== saved.id)];
  changed();
  return saved;
}
export async function deleteQuiz(id: string): Promise<void> {
  const quiz = getQuizById(id);
  if (!quiz) throw Error('Muat ulang koleksi sebelum menghapus kuis.');
  await request({ action: 'delete', id, updatedAt: quiz.updatedAt });
  quizzes = quizzes.filter(q => q.id !== id);
  changed();
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
  const id = `quiz-${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')}`;
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
    updatedAt: 0,
  };
}
