import { api } from "./client";
import type { ApiLessonVideo } from "./types";

// Videos are streamed, not synced: the urls are signed and short-lived, so the
// list is fetched fresh each time the lesson opens rather than cached.
export function getLessonVideos(lessonId: number) {
  return api<{ videos: ApiLessonVideo[] }>(`/content/lessons/${lessonId}/videos`);
}
