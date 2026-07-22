import { api } from "../api/client";
import { listUnsyncedAttempts, markAttemptSynced } from "../db/attempts";

// Best-effort upload of local attempts. Silent-fail offline; the server is
// idempotent on attempt id so re-sends are safe.
export async function pushAttempts(): Promise<void> {
  const pending = listUnsyncedAttempts();
  for (const a of pending) {
    // Mock exams (seriesId 0) have no server-side series — never push them.
    if (a.seriesId <= 0) continue;
    try {
      await api("/attempts", {
        method: "POST",
        json: {
          id: a.id,
          seriesId: a.seriesId,
          score: a.score,
          total: a.total,
          passed: a.passed,
          finishedAt: a.finishedAt,
          details: a.details,
        },
      });
      markAttemptSynced(a.id);
    } catch {
      // Offline or transient — leave it unsynced for the next attempt.
      return;
    }
  }
}
