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
