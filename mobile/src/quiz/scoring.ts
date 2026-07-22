// Exact-set scoring — no partial credit (quiz-engine skill).
export function isExactMatch(selected: number[], correct: number[]): boolean {
  if (selected.length !== correct.length) return false;
  const a = [...selected].sort((x, y) => x - y);
  const b = [...correct].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}
