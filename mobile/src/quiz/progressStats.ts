import type { AttemptRecord } from "../db/attempts";

export interface SeriesStat {
  seriesId: number;
  title: string;
  bestScore: number;
  bestTotal: number;
  bestRatio: number;
  attemptCount: number;
  lastPassed: boolean;
}

export interface Progress {
  perSeries: SeriesStat[];
  overallPassRate: number; // 0..1
  totalAttempts: number;
  weakest: SeriesStat[];
  history: AttemptRecord[];
}

// All computed offline from local attempts (quiz-engine skill).
export function computeProgress(
  attempts: AttemptRecord[],
  titleOf: (seriesId: number) => string,
): Progress {
  const bySeries = new Map<number, AttemptRecord[]>();
  for (const a of attempts) {
    const list = bySeries.get(a.seriesId) ?? [];
    list.push(a);
    bySeries.set(a.seriesId, list);
  }

  const perSeries: SeriesStat[] = [];
  for (const [seriesId, list] of bySeries) {
    // list keeps input order (newest-first from listAttempts).
    let best = list[0]!;
    for (const a of list) {
      if (a.score / a.total > best.score / best.total) best = a;
    }
    perSeries.push({
      seriesId,
      title: titleOf(seriesId),
      bestScore: best.score,
      bestTotal: best.total,
      bestRatio: best.total > 0 ? best.score / best.total : 0,
      attemptCount: list.length,
      lastPassed: list[0]!.passed, // newest-first
    });
  }
  perSeries.sort((a, b) => a.title.localeCompare(b.title));

  const passed = attempts.filter((a) => a.passed).length;
  const weakest = [...perSeries]
    .sort((a, b) => a.bestRatio - b.bestRatio)
    .slice(0, 3);

  return {
    perSeries,
    overallPassRate: attempts.length > 0 ? passed / attempts.length : 0,
    totalAttempts: attempts.length,
    weakest,
    history: attempts,
  };
}
