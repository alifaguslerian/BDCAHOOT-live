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

/**
 * Display-enriched option representation for the stage projector reveal phase.
 */
export interface ArenaDisplayOption {
  key: OptionId;
  label: string;
  text: string;
  symbol: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isCorrect: boolean;
  voteCount: number;
  votePercentage: number;
}

/**
 * Display-enriched question for stage projector rendering with metadata and aggregated stats.
 */
export interface ArenaDisplayQuestion {
  id: string;
  number: number;
  totalQuestions: number;
  category: string;
  points: number;
  question: string;
  options: [ArenaDisplayOption, ArenaDisplayOption, ArenaDisplayOption, ArenaDisplayOption];
}
