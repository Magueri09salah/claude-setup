export interface QuestionResult {
  questionId: number;
  order: number;
  selected: number[];
  correct: number[];
  isCorrect: boolean;
  timedOut: boolean;
}

// Canonical Moroccan exam is 40 questions, pass at 32 (80%). Seeded dev series
// have fewer, so the pass mark scales at the same ratio (40 -> 32, 3 -> 2).
export const EXAM_TOTAL = 40;
export const PASS_RATIO = 0.8;

export function passMarkFor(total: number): number {
  return Math.round(total * PASS_RATIO);
}
