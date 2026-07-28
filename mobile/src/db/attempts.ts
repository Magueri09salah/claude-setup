import { db } from "./index";
import type { QuestionResult } from "../quiz/types";

export interface AttemptRecord {
  id: string;
  seriesId: number;
  score: number;
  total: number;
  passed: boolean;
  finishedAt: string;
  details: QuestionResult[];
}

interface AttemptRow {
  id: string;
  series_id: number;
  score: number;
  total: number;
  passed: number;
  details_json: string;
  finished_at: string;
  synced: number;
}

// Not cryptographic — just a unique, format-valid id the API accepts as UUID.
export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fromRow(r: AttemptRow): AttemptRecord {
  return {
    id: r.id,
    seriesId: r.series_id,
    score: r.score,
    total: r.total,
    passed: r.passed === 1,
    finishedAt: r.finished_at,
    details: JSON.parse(r.details_json) as QuestionResult[],
  };
}

export function saveAttempt(a: AttemptRecord, synced = false): void {
  db.runSync(
    `INSERT INTO attempts (id, series_id, score, total, passed, details_json, finished_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    a.id,
    a.seriesId,
    a.score,
    a.total,
    a.passed ? 1 : 0,
    JSON.stringify(a.details),
    a.finishedAt,
    synced ? 1 : 0,
  );
}

// First-ever pass of a series earns the one celebration (design-eng: spend
// delight only on rare moments).
export function countPassedAttempts(seriesId: number): number {
  return (
    db.getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM attempts WHERE series_id = ? AND passed = 1",
      seriesId,
    )?.n ?? 0
  );
}

// Best (highest-scoring) attempt per series — shown on the series card so the
// user always sees their personal best (e.g. 1/3, 3/3, 2/3 → 3/3).
export interface BestScore {
  score: number;
  total: number;
  passed: boolean;
}

export function bestScoresBySeries(): Map<number, BestScore> {
  const rows = db.getAllSync<{
    series_id: number;
    score: number;
    total: number;
    passed: number;
  }>(
    `SELECT series_id, score, total, passed
       FROM attempts a
      WHERE score = (SELECT MAX(score) FROM attempts b WHERE b.series_id = a.series_id)
      GROUP BY series_id`,
  );
  const map = new Map<number, BestScore>();
  for (const r of rows) {
    map.set(r.series_id, {
      score: r.score,
      total: r.total,
      passed: r.passed === 1,
    });
  }
  return map;
}

export function getAttempt(id: string): AttemptRecord | null {
  const row = db.getFirstSync<AttemptRow>(
    "SELECT * FROM attempts WHERE id = ?",
    id,
  );
  return row ? fromRow(row) : null;
}

export function listAttempts(): AttemptRecord[] {
  return db
    .getAllSync<AttemptRow>("SELECT * FROM attempts ORDER BY finished_at DESC")
    .map(fromRow);
}

export function listUnsyncedAttempts(): AttemptRecord[] {
  return db
    .getAllSync<AttemptRow>("SELECT * FROM attempts WHERE synced = 0")
    .map(fromRow);
}

export function markAttemptSynced(id: string): void {
  db.runSync("UPDATE attempts SET synced = 1 WHERE id = ?", id);
}
