import { router } from "expo-router";
import { listChildCategories, listLessons } from "../db/lessons";

// Open a category directly to its sign grid when it's a leaf with one lesson
// (matches the reference app: sub-category → signs, no lesson-list layer).
export function openCategory(id: number): void {
  if (listChildCategories(id).length === 0) {
    const lessons = listLessons(id);
    if (lessons.length === 1) {
      router.push(`/lesson/${lessons[0]!.id}`);
      return;
    }
  }
  router.push(`/lessons/${id}`);
}
