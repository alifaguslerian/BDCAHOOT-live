export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface QuizOption {
  id: OptionId;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [QuizOption, QuizOption, QuizOption, QuizOption];
  correctOption: OptionId;
  timerSeconds: number; // 10, 15, 20, or 30 seconds (default 20)
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: number;
  updatedAt: number;
}

export interface QuizValidationResult {
  isValid: boolean;
  incompleteQuestionIndices: number[];
  errors: string[];
}
