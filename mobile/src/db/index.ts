import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("tariq.db");

// Bump this whenever migrate() adds a column that must be BACKFILLED from the
// server. A guarded ALTER gives existing rows the column DEFAULT, and the sync
// then asks for the manifest with If-None-Match — which answers 304 while the
// content version is unchanged, so those rows would keep the default forever.
// The sync compares this against `synced_schema_version` and ignores its cached
// etag until one full manifest fetch has succeeded.
// (v2: series.category — a moto series stayed filed under B until publish.)
export const LOCAL_SCHEMA_VERSION = 2;

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
      question_count INTEGER NOT NULL DEFAULT 0,
      -- Licence category: B = car (default), A = moto, C = truck, D = bus.
      category TEXT NOT NULL DEFAULT 'B'
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
      correction_text TEXT,
      correction_audio_key TEXT,
      correction_audio_path TEXT,
      downloaded INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_questions_series ON questions(series_id);

    CREATE TABLE IF NOT EXISTS lesson_categories (
      id INTEGER PRIMARY KEY,
      parent_id INTEGER,
      title TEXT NOT NULL,
      icon_key TEXT,
      icon_path TEXT,
      order_num INTEGER NOT NULL,
      is_premium INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      sign_count INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      image_key TEXT,
      image_path TEXT,
      -- 'SIGNS' (flashcards, synced offline) | 'VIDEOS' (streamed on demand)
      kind TEXT NOT NULL DEFAULT 'SIGNS',
      video_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS lesson_signs (
      id INTEGER PRIMARY KEY,
      lesson_id INTEGER NOT NULL,
      order_num INTEGER NOT NULL,
      name TEXT NOT NULL,
      image_key TEXT NOT NULL,
      audio_key TEXT,
      image_path TEXT,
      audio_path TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_signs_lesson ON lesson_signs(lesson_id);

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

  // Columns added in M4 — guarded ALTERs for databases created by M2 installs.
  for (const ddl of [
    "ALTER TABLE lesson_categories ADD COLUMN icon_path TEXT",
    "ALTER TABLE lesson_categories ADD COLUMN locked INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE lessons ADD COLUMN block_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE lessons ADD COLUMN locked INTEGER NOT NULL DEFAULT 0",
    // M4 v2: lessons are grids of signs, not blocks.
    "ALTER TABLE lessons ADD COLUMN sign_count INTEGER NOT NULL DEFAULT 0",
    "DROP TABLE IF EXISTS lesson_blocks",
    // Post-M6: per-question correction shown in the end-of-quiz review.
    "ALTER TABLE questions ADD COLUMN correction_text TEXT",
    "ALTER TABLE questions ADD COLUMN correction_audio_key TEXT",
    "ALTER TABLE questions ADD COLUMN correction_audio_path TEXT",
    // Post-M6: series belong to a licence category (moto / truck / bus).
    "ALTER TABLE series ADD COLUMN category TEXT NOT NULL DEFAULT 'B'",
    // Post-M6: optional cover image on a lesson card.
    "ALTER TABLE lessons ADD COLUMN image_key TEXT",
    "ALTER TABLE lessons ADD COLUMN image_path TEXT",
    // Post-M6: video lessons (المركبة).
    "ALTER TABLE lessons ADD COLUMN kind TEXT NOT NULL DEFAULT 'SIGNS'",
    "ALTER TABLE lessons ADD COLUMN video_count INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      db.execSync(ddl);
    } catch {
      // column already exists / table already gone
    }
  }
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

export type LicenceCategory = "B" | "A" | "C" | "D";

export interface SeriesRow {
  id: number;
  title: string;
  order_num: number;
  is_premium: number;
  locked: number;
  question_count: number;
  category: LicenceCategory;
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
  correction_text: string | null;
  correction_audio_key: string | null;
  correction_audio_path: string | null;
  downloaded: number;
  updated_at: string;
}

// Always scoped to one licence — a car candidate must never see moto series.
export function listSeries(category: LicenceCategory = "B"): SeriesRow[] {
  return db.getAllSync<SeriesRow>(
    "SELECT * FROM series WHERE category = ? ORDER BY order_num ASC",
    category,
  );
}

/** Categories that actually have content, so empty tabs can be hidden. */
export function seriesCountByCategory(): Map<LicenceCategory, number> {
  const rows = db.getAllSync<{ category: LicenceCategory; n: number }>(
    "SELECT category, COUNT(*) AS n FROM series GROUP BY category",
  );
  return new Map(rows.map((r) => [r.category, r.n]));
}
