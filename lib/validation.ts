import type { Quiz, QuizQuestion, QuizValidationResult } from '@/types/quiz';

/**
 * Locked Name Validation Rule (D13, E#22):
 * - Must be unique per room (case-insensitive)
 * - Only uppercase/lowercase letters A-Z
 * - No numbers, spaces, or special characters
 */
export function validatePlayerName(
  name: string,
  existingPlayerNames: string[]
): { isValid: boolean; sanitizedName: string; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { isValid: false, sanitizedName: '', error: 'Nama tidak boleh kosong.' };
  }

  // Only alphabets A-Z (case-insensitive)
  const alphabetOnlyRegex = /^[a-zA-Z]+$/;
  if (!alphabetOnlyRegex.test(trimmed)) {
    return {
      isValid: false,
      sanitizedName: trimmed,
      error: 'Nama hanya boleh menggunakan huruf (A-Z), tanpa angka, spasi, atau simbol.',
    };
  }

  // Case-insensitive uniqueness check
  const lowerName = trimmed.toLowerCase();
  const isDuplicate = existingPlayerNames.some(
    (existing) => existing.toLowerCase() === lowerName
  );

  if (isDuplicate) {
    return {
      isValid: false,
      sanitizedName: trimmed,
      error: `Nama "${trimmed}" sudah digunakan di room ini. Coba nama lain.`,
    };
  }

  return { isValid: true, sanitizedName: trimmed };
}

/**
 * Quiz Completeness Validation (D3, D4, E#17, E#18):
 * - Minimum 1 question
 * - Question text non-empty
 * - All 4 options non-empty
 * - Exactly 1 correct option marked
 * - Timer duration valid
 */
export function validateQuestion(question: QuizQuestion): { isValid: boolean; missingFields: string[] } {
  const missing: string[] = [];

  if (!question.question?.trim()) {
    missing.push('Pertanyaan belum diisi');
  }

  const optionIds = ['A', 'B', 'C', 'D'] as const;
  for (const optId of optionIds) {
    const opt = question.options?.find((o) => o.id === optId);
    if (!opt || !opt.text?.trim()) {
      missing.push(`Pilihan ${optId} belum diisi`);
    }
  }

  if (!['A', 'B', 'C', 'D'].includes(question.correctOption)) {
    missing.push('Jawaban benar belum ditentukan');
  }

  if (!question.timerSeconds || question.timerSeconds <= 0) {
    missing.push('Durasi timer tidak valid');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

export function validateQuiz(quiz: Quiz): QuizValidationResult {
  const errors: string[] = [];
  const incompleteQuestionIndices: number[] = [];

  if (!quiz.questions || quiz.questions.length === 0) {
    errors.push('Quiz harus memiliki minimal 1 soal.');
    return { isValid: false, incompleteQuestionIndices, errors };
  }

  quiz.questions.forEach((q, idx) => {
    const qValidation = validateQuestion(q);
    if (!qValidation.isValid) {
      incompleteQuestionIndices.push(idx);
      errors.push(`Soal #${idx + 1}: ${qValidation.missingFields.join(', ')}`);
    }
  });

  return {
    isValid: incompleteQuestionIndices.length === 0,
    incompleteQuestionIndices,
    errors,
  };
}
