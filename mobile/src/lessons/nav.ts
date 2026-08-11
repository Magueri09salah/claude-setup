import { router } from "expo-router";

// Always land on the category page. An earlier version skipped straight to the
// signs when a category held exactly one lesson, but the owner's 3-page flow
// (categories → numbered lessons → content, sketch 2026-08-07) needs the middle
// level to be predictable — a shortcut that fires only sometimes is confusing.
export function openCategory(id: number): void {
  router.push(`/lessons/${id}`);
}
