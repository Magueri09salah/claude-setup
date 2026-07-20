import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("tariq.db");

// Local mirror of the server content (see architecture skill). DB stores UTC.
export function migrate(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS series (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      is_premium INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      question_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      series_id INTEGER NOT NULL,
      order_num INTEGER NOT NULL,
      answers_count INTEGER NOT NULL DEFAULT 4,
      correct_answers TEXT NOT NULL,
      image_key TEXT NOT NULL,
      audio_key TEXT NOT NULL,
      image_path TEXT,
      audio_path TEXT,
      downloaded INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_questions_series ON questions(series_id);

    CREATE TABLE IF NOT EXISTS lesson_categories (
      id INTEGER PRIMARY KEY,
      parent_id INTEGER,
      title TEXT NOT NULL,
      icon_key TEXT,
      order_num INTEGER NOT NULL,
      is_premium INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lesson_blocks (
      id INTEGER PRIMARY KEY,
      lesson_id INTEGER NOT NULL,
      order_num INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      media_key TEXT,
      media_path TEXT
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      series_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL DEFAULT 40,
      passed INTEGER NOT NULL,
      details_json TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function getMeta(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM meta WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  db.runSync(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

export interface SeriesRow {
  id: number;
  title: string;
  order_num: number;
  is_premium: number;
  locked: number;
  question_count: number;
}

export interface QuestionRow {
  id: number;
  series_id: number;
  order_num: number;
  answers_count: number;
  correct_answers: string;
  image_key: string;
  audio_key: string;
  image_path: string | null;
  audio_path: string | null;
  downloaded: number;
  updated_at: string;
}

export function listSeries(): SeriesRow[] {
  return db.getAllSync<SeriesRow>("SELECT * FROM series ORDER BY order_num ASC");
}
