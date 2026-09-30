export const MAX_QUIZ_BYTES = 200 * 1024;

export function fitsQuizPayload(quiz: unknown, settings?: unknown): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify([quiz, settings])).length <= MAX_QUIZ_BYTES;
  } catch {
    return false;
  }
}
