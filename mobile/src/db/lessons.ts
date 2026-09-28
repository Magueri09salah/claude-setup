import { db } from "./index";

export interface CategoryRow {
  id: number;
  parent_id: number | null;
  title: string;
  icon_key: string | null;
  icon_path: string | null;
  order_num: number;
  is_premium: number;
  locked: number;
}

export interface LessonRow {
  id: number;
  category_id: number;
  title: string;
  order_num: number;
  updated_at: string;
  sign_count: number;
  locked: number;
  image_key: string | null;
  image_path: string | null;
  kind: LessonKind;
  video_count: number;
}

/** A lesson is either sign flashcards or a list of videos, never both. */
export type LessonKind = "SIGNS" | "VIDEOS";

export interface SignRow {
  id: number;
  lesson_id: number;
  order_num: number;
  name: string;
  image_key: string;
  audio_key: string | null;
  image_path: string | null;
  audio_path: string | null;
}

export function listTopCategories(): CategoryRow[] {
  return db.getAllSync<CategoryRow>(
    "SELECT * FROM lesson_categories WHERE parent_id IS NULL ORDER BY order_num ASC",
  );
}

export function getCategory(id: number): CategoryRow | null {
  return db.getFirstSync<CategoryRow>(
    "SELECT * FROM lesson_categories WHERE id = ?",
    id,
  );
}

export function listChildCategories(parentId: number): CategoryRow[] {
  return db.getAllSync<CategoryRow>(
    "SELECT * FROM lesson_categories WHERE parent_id = ? ORDER BY order_num ASC",
    parentId,
  );
}

export function listLessons(categoryId: number): LessonRow[] {
  return db.getAllSync<LessonRow>(
    "SELECT * FROM lessons WHERE category_id = ? ORDER BY order_num ASC",
    categoryId,
  );
}

export function getLesson(id: number): LessonRow | null {
  return db.getFirstSync<LessonRow>("SELECT * FROM lessons WHERE id = ?", id);
}

/**
 * Signs whose files are fully on disk, per lesson, in one query.
 *
 * Same rule the exam series uses (owner decision 2026-09-28): a lesson is not
 * openable until everything it needs is downloaded, otherwise it opens onto a
 * half-empty flashcard grid and looks broken.
 *
 * Audio is OPTIONAL on a sign, so a sign with no audio_key counts as ready on
 * its picture alone — requiring audio_path outright would leave those lessons
 * stuck below their total for ever.
 */
export function downloadedSignCountsByLesson(): Map<number, number> {
  const rows = db.getAllSync<{ lesson_id: number; n: number }>(
    `SELECT lesson_id, COUNT(*) AS n FROM lesson_signs
      WHERE image_path IS NOT NULL
        AND (audio_key IS NULL OR audio_path IS NOT NULL)
      GROUP BY lesson_id`,
  );
  return new Map(rows.map((r) => [r.lesson_id, r.n]));
}

export interface DownloadState {
  ready: number;
  total: number;
}

/**
 * Signs ready vs expected for each category, counting its WHOLE SUBTREE.
 *
 * A category row is a door to everything beneath it, so it has to report the
 * same thing a series card does (owner decision 2026-09-28): a top-level
 * التشوير الطرقي is only ready once every sign in every lesson under it is
 * on disk, however deep the tree goes.
 *
 * VIDEOS lessons are excluded — they stream and are never downloaded, so
 * counting them would leave a category permanently short of its total.
 */
export function signProgressByCategory(): Map<number, DownloadState> {
  const cats = db.getAllSync<{ id: number; parent_id: number | null }>(
    "SELECT id, parent_id FROM lesson_categories",
  );
  const lessons = db.getAllSync<{
    id: number;
    category_id: number;
    sign_count: number;
  }>("SELECT id, category_id, sign_count FROM lessons WHERE kind = 'SIGNS'");
  const ready = downloadedSignCountsByLesson();

  const parent = new Map(cats.map((c) => [c.id, c.parent_id]));
  const out = new Map<number, DownloadState>();
  for (const c of cats) out.set(c.id, { ready: 0, total: 0 });

  for (const lesson of lessons) {
    // Clamped: a stale sign_count from an older manifest must never let a
    // card report 41/40 and look broken.
    const got = Math.min(ready.get(lesson.id) ?? 0, lesson.sign_count);
    let cursor: number | null = lesson.category_id;
    // Depth guard: a corrupt parent chain must not spin for ever.
    for (let hops = 0; cursor !== null && hops < 10; hops++) {
      const entry = out.get(cursor);
      if (!entry) break;
      entry.ready += got;
      entry.total += lesson.sign_count;
      cursor = parent.get(cursor) ?? null;
    }
  }
  return out;
}

export function listSigns(lessonId: number): SignRow[] {
  return db.getAllSync<SignRow>(
    "SELECT * FROM lesson_signs WHERE lesson_id = ? ORDER BY order_num ASC",
    lessonId,
  );
}

// A leaf sub-category usually holds exactly one lesson (the sign grid), so the
// mobile UI opens it directly — matching the reference app.
export function soleLessonOf(categoryId: number): LessonRow | null {
  const lessons = listLessons(categoryId);
  return lessons.length === 1 ? lessons[0]! : null;
}
