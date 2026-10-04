import { fitsQuizPayload } from '../lib/quizLimits';
import type { LibraryRequest } from '../types/quizLibrary';
import type { Quiz, QuizQuestion, OptionId } from '../types/quiz';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Data kuis tidak valid.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw Error('Teks kuis tidak valid atau terlalu panjang.');
  return value;
}
function timestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error('Versi kuis tidak valid.');
  return value;
}
export function parseLibraryRequest(value: unknown): LibraryRequest {
  const request = record(value);
  if (request.action === 'list') return { action: 'list' };
  if (request.action === 'get') return { action: 'get', id: text(request.id, 100, true) };
  if (request.action === 'delete') return { action: 'delete', id: text(request.id, 100, true), updatedAt: timestamp(request.updatedAt) };
  if (request.action !== 'save' && request.action !== 'import') throw Error('Perintah koleksi kuis tidak valid.');
  if (!fitsQuizPayload(request.quiz)) throw Error('Ukuran kuis terlalu besar.');
  const input = record(request.quiz);
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 200) throw Error('Kuis harus memiliki 1 sampai 200 soal.');
  const ids = new Set<string>();
  const questions = input.questions.map(value => {
    const q = record(value), id = text(q.id, 100, true);
    if (ids.has(id)) throw Error('ID soal harus unik.');
    ids.add(id);
    const options = ['A', 'B', 'C', 'D'];
    if (!Array.isArray(q.options) || q.options.length !== 4 || !options.includes(q.correctOption as string)) throw Error('Pilihan jawaban tidak valid.');
    if (!Number.isInteger(q.timerSeconds) || Number(q.timerSeconds) < 5 || Number(q.timerSeconds) > 120) throw Error('Timer harus 5 sampai 120 detik.');
    return { id, question: text(q.question, 4000), correctOption: q.correctOption as OptionId, timerSeconds: Number(q.timerSeconds),
      options: q.options.map((value, i) => {
        const option = record(value);
        if (option.id !== options[i]) throw Error('Pilihan harus berurutan A, B, C, D.');
        return { id: option.id as OptionId, text: text(option.text, 1000) };
      }) as QuizQuestion['options'] };
  });
  const quiz: Quiz = { id: text(input.id, 100, true), title: text(input.title, 200), questions,
    createdAt: timestamp(input.createdAt), updatedAt: timestamp(input.updatedAt) };
  if (input.category !== undefined) quiz.category = text(input.category, 200);
  return { action: request.action, quiz };
}
