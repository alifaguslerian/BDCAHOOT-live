import type { Quiz } from './quiz';

export type LibraryRequest =
  | { action: 'list' }
  | { action: 'get'; id: string }
  | { action: 'save' | 'import'; quiz: Quiz }
  | { action: 'delete'; id: string; updatedAt: number };
export type LibraryResult = Quiz[] | Quiz | null;
