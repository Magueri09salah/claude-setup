import { api, hasSession } from "../api/client";
import { listUnsyncedAttempts, markAttemptSynced } from "../db/attempts";

// Best-effort upload of local attempts. Silent-fail offline; the server is
// idempotent on attempt id so re-sends are safe.
//
// A GUEST's results stay on the phone (owner decision 2026-11-12): they are
// simply left unsynced, and go up with the first sign-in, which calls this.
export async function pushAttempts(): Promise<void> {
  if (!hasSession()) return;
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
