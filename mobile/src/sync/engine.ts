import { Directory, File, Paths } from "expo-file-system";
import { api, apiFetch } from "../api/client";
import type { ApiQuestion, ApiSign, Manifest } from "../api/types";
import { API_URL } from "../config";
import {
  db,
  getMeta,
  LOCAL_SCHEMA_VERSION,
  setMeta,
  type QuestionRow,
} from "../db";

// Sync engine (see architecture skill):
// manifest w/ If-None-Match → 304 = done. Else upsert rows, prune absentees,
// signed URLs in batches of 20, per-question `downloaded` flag (RESUMABLE),
// flip content_version ONLY when every file is on disk. Silent-fail offline.

export interface SyncProgress {
  phase: "checking" | "data" | "media";
  done: number;
  total: number;
}

export type SyncResult = "up-to-date" | "synced" | "partial" | "offline";

const MEDIA_BATCH = 20;
const FOREGROUND_THROTTLE_MS = 60 * 60 * 1000;

let running = false;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function ensureDir(segments: string[]): Directory {
  let dir = new Directory(Paths.document, segments[0]!);
  if (!dir.exists) dir.create();
  for (const segment of segments.slice(1)) {
    dir = new Directory(dir, segment);
    if (!dir.exists) dir.create();
  }
  return dir;
}

function mediaFileFor(key: string): File {
  const segments = key.split("/");
  const name = segments.pop()!;
  const dir = ensureDir(["media", ...segments]);
  return new File(dir, name);
}

function upsertQuestions(rows: ApiQuestion[]): void {
  db.withTransactionSync(() => {
    for (const q of rows) {
      const existing = db.getFirstSync<QuestionRow>(
        "SELECT * FROM questions WHERE id = ?",
        q.id,
      );
      // A changed media key means new files must be fetched (keys are immutable
      // server-side, replacements arrive as _v2 keys).
      const mediaChanged =
        !existing ||
        existing.image_key !== q.imageKey ||
        existing.audio_key !== q.audioKey;
      // The correction voice-over is optional and independent: swapping it must
      // not force the question's own image/audio to be downloaded again.
      const correctionChanged =
        !existing || existing.correction_audio_key !== q.correctionAudioKey;
      db.runSync(
        `INSERT INTO questions
           (id, series_id, order_num, answers_count, correct_answers,
            image_key, audio_key, image_path, audio_path,
            correction_text, correction_audio_key, correction_audio_path,
            downloaded, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           series_id = excluded.series_id,
           order_num = excluded.order_num,
           answers_count = excluded.answers_count,
           correct_answers = excluded.correct_answers,
           image_key = excluded.image_key,
           audio_key = excluded.audio_key,
           image_path = excluded.image_path,
           audio_path = excluded.audio_path,
           correction_text = excluded.correction_text,
           correction_audio_key = excluded.correction_audio_key,
           correction_audio_path = excluded.correction_audio_path,
           downloaded = excluded.downloaded,
           updated_at = excluded.updated_at`,
        q.id,
        q.seriesId,
        q.orderNum,
        q.answersCount,
        JSON.stringify(q.correctAnswers),
        q.imageKey,
        q.audioKey,
        mediaChanged ? null : (existing?.image_path ?? null),
        mediaChanged ? null : (existing?.audio_path ?? null),
        q.correctionText ?? null,
        q.correctionAudioKey ?? null,
        correctionChanged ? null : (existing?.correction_audio_path ?? null),
        mediaChanged ? 0 : (existing?.downloaded ?? 0),
        q.updatedAt,
      );
    }
  });
}

export async function runSync(
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  if (running) return "up-to-date";
  running = true;
  try {
    onProgress?.({ phase: "checking", done: 0, total: 0 });

    // 1. Manifest with If-None-Match — unless the local schema gained columns
    // the last sync never filled. A guarded ALTER leaves those rows on their
    // DEFAULT, and the server would answer 304 (content unchanged) forever, so
    // the etag is ignored until one full fetch has actually repopulated them.
    const schemaStale =
      getMeta("synced_schema_version") !== String(LOCAL_SCHEMA_VERSION);
    const storedEtag = schemaStale ? null : getMeta("manifest_etag");
    const res = await apiFetch("/content/manifest", {
      headers: storedEtag ? { "If-None-Match": storedEtag } : {},
    });
    if (res.status === 304) {
      setMeta("last_sync", new Date().toISOString());
      return "up-to-date";
    }
    if (!res.ok) return "offline";
    const manifest = (await res.json()) as Manifest;
    const newEtag = res.headers.get("etag");

    // 2. Upsert series and prune anything absent from the manifest.
    const since = getMeta("last_sync");
    // Captured BEFORE the upsert so we can detect changed lessons afterwards.
    const localLessonState = new Map(
      db
        .getAllSync<{ id: number; updated_at: string; n: number }>(
          `SELECT l.id, l.updated_at, COUNT(s.id) AS n
             FROM lessons l LEFT JOIN lesson_signs s ON s.lesson_id = l.id
            GROUP BY l.id`,
        )
        .map((r) => [r.id, r]),
    );
    const serverIds = manifest.series.map((s) => s.id);
    db.withTransactionSync(() => {
      if (serverIds.length === 0) {
        db.runSync("DELETE FROM questions");
        db.runSync("DELETE FROM series");
      } else {
        const ph = serverIds.map(() => "?").join(",");
        db.runSync(
          `DELETE FROM questions WHERE series_id NOT IN (${ph})`,
          ...serverIds,
        );
        db.runSync(`DELETE FROM series WHERE id NOT IN (${ph})`, ...serverIds);
      }
      for (const s of manifest.series) {
        db.runSync(
          `INSERT INTO series
             (id, title, order_num, is_premium, locked, question_count, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             order_num = excluded.order_num,
             is_premium = excluded.is_premium,
             locked = excluded.locked,
             question_count = excluded.question_count,
             category = excluded.category`,
          s.id,
          s.title,
          s.orderNum,
          s.isPremium ? 1 : 0,
          s.locked ? 1 : 0,
          s.questionCount,
          // Older servers omit it; those installs are all car content.
          s.category ?? "B",
        );
      }
      // Locked (premium, unentitled) series keep their teaser row but no content.
      const lockedIds = manifest.series.filter((s) => s.locked).map((s) => s.id);
      if (lockedIds.length > 0) {
        const ph = lockedIds.map(() => "?").join(",");
        db.runSync(`DELETE FROM questions WHERE series_id IN (${ph})`, ...lockedIds);
      }

      // Lesson categories: upsert + prune (teaser rows stay for locked ones).
      const catIds = manifest.lessonCategories.map((c) => c.id);
      if (catIds.length === 0) {
        db.runSync("DELETE FROM lesson_blocks");
        db.runSync("DELETE FROM lessons");
        db.runSync("DELETE FROM lesson_categories");
      } else {
        const ph = catIds.map(() => "?").join(",");
        db.runSync(
          `DELETE FROM lesson_categories WHERE id NOT IN (${ph})`,
          ...catIds,
        );
      }
      for (const c of manifest.lessonCategories) {
        db.runSync(
          `INSERT INTO lesson_categories
             (id, parent_id, title, icon_key, order_num, is_premium, locked)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             parent_id = excluded.parent_id,
             title = excluded.title,
             icon_path = CASE WHEN lesson_categories.icon_key = excluded.icon_key
                              THEN lesson_categories.icon_path ELSE NULL END,
             icon_key = excluded.icon_key,
             order_num = excluded.order_num,
             is_premium = excluded.is_premium,
             locked = excluded.locked`,
          c.id,
          c.parentId,
          c.title,
          c.iconKey,
          c.orderNum,
          c.isPremium ? 1 : 0,
          c.locked ? 1 : 0,
        );
      }

      // Lessons: upsert + prune; locked lessons keep the row, lose the signs.
      const lessonIds = manifest.lessons.map((l) => l.id);
      if (lessonIds.length === 0) {
        db.runSync("DELETE FROM lesson_signs");
        db.runSync("DELETE FROM lessons");
      } else {
        const ph = lessonIds.map(() => "?").join(",");
        db.runSync(
          `DELETE FROM lesson_signs WHERE lesson_id NOT IN (${ph})`,
          ...lessonIds,
        );
        db.runSync(`DELETE FROM lessons WHERE id NOT IN (${ph})`, ...lessonIds);
      }
      for (const l of manifest.lessons) {
        const prevKey =
          db.getFirstSync<{ image_key: string | null; image_path: string | null }>(
            "SELECT image_key, image_path FROM lessons WHERE id = ?",
            l.id,
          ) ?? null;
        const newKey = l.imageKey ?? null;
        // Keep the file already on disk only while the key is unchanged; a
        // replaced cover must be re-fetched, not shown stale.
        const keptPath =
          prevKey && prevKey.image_key === newKey ? prevKey.image_path : null;
        db.runSync(
          `INSERT INTO lessons
             (id, category_id, title, order_num, updated_at, sign_count, locked,
              image_key, image_path, kind, video_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             category_id = excluded.category_id,
             title = excluded.title,
             order_num = excluded.order_num,
             updated_at = excluded.updated_at,
             sign_count = excluded.sign_count,
             locked = excluded.locked,
             image_key = excluded.image_key,
             image_path = excluded.image_path,
             kind = excluded.kind,
             video_count = excluded.video_count`,
          l.id,
          l.categoryId,
          l.title,
          l.orderNum,
          l.updatedAt,
          l.signCount,
          l.locked ? 1 : 0,
          newKey,
          keptPath,
          // Older servers omit these; those installs are all sign lessons.
          l.kind ?? "SIGNS",
          l.videoCount ?? 0,
        );
      }
      const lockedLessonIds = manifest.lessons
        .filter((l) => l.locked)
        .map((l) => l.id);
      if (lockedLessonIds.length > 0) {
        const ph = lockedLessonIds.map(() => "?").join(",");
        db.runSync(
          `DELETE FROM lesson_signs WHERE lesson_id IN (${ph})`,
          ...lockedLessonIds,
        );
      }
    });

    // 3. Fetch changed questions per unlocked series (updatedAt > last_sync);
    //    fall back to a full fetch when local count drifts (covers deletions).
    const unlocked = manifest.series.filter((s) => !s.locked);
    onProgress?.({ phase: "data", done: 0, total: unlocked.length });
    let fetched = 0;
    for (const s of unlocked) {
      const query = since ? `?since=${encodeURIComponent(since)}` : "";
      const { questions } = await api<{ questions: ApiQuestion[] }>(
        `/content/series/${s.id}/questions${query}`,
      );
      upsertQuestions(questions);
      const local =
        db.getFirstSync<{ n: number }>(
          "SELECT COUNT(*) AS n FROM questions WHERE series_id = ?",
          s.id,
        )?.n ?? 0;
      if (local !== s.questionCount) {
        const all = await api<{ questions: ApiQuestion[] }>(
          `/content/series/${s.id}/questions`,
        );
        db.withTransactionSync(() => {
          const ids = all.questions.map((q) => q.id);
          if (ids.length === 0) {
            db.runSync("DELETE FROM questions WHERE series_id = ?", s.id);
          } else {
            const ph = ids.map(() => "?").join(",");
            db.runSync(
              `DELETE FROM questions WHERE series_id = ? AND id NOT IN (${ph})`,
              s.id,
              ...ids,
            );
          }
        });
        upsertQuestions(all.questions);
      }
      fetched += 1;
      onProgress?.({ phase: "data", done: fetched, total: unlocked.length });
    }

    // 3b. Fetch signs for new/changed unlocked lessons (full replace per lesson).
    for (const l of manifest.lessons.filter((x) => !x.locked)) {
      const prev = localLessonState.get(l.id);
      const changed =
        !prev || prev.updated_at !== l.updatedAt || prev.n !== l.signCount;
      if (!changed) continue;
      const { signs } = await api<{ signs: ApiSign[] }>(
        `/content/lessons/${l.id}/signs`,
      );
      db.withTransactionSync(() => {
        db.runSync("DELETE FROM lesson_signs WHERE lesson_id = ?", l.id);
        for (const s of signs) {
          db.runSync(
            `INSERT INTO lesson_signs
               (id, lesson_id, order_num, name, image_key, audio_key, image_path, audio_path)
             VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
            s.id,
            s.lessonId,
            s.orderNum,
            s.name,
            s.imageKey,
            s.audioKey,
          );
        }
      });
    }

    // 4. Download missing media, batching signed URLs 20 keys at a time.
    const pending = db.getAllSync<QuestionRow>(
      "SELECT * FROM questions WHERE downloaded = 0",
    );
    // A job = one file to fetch + the UPDATE that records its local path.
    const jobs: { key: string; sql: string; id: number }[] = [];
    for (const q of pending) {
      jobs.push({
        key: q.image_key,
        sql: "UPDATE questions SET image_path = ? WHERE id = ?",
        id: q.id,
      });
      jobs.push({
        key: q.audio_key,
        sql: "UPDATE questions SET audio_path = ? WHERE id = ?",
        id: q.id,
      });
    }
    // Correction audio is optional, so it hangs off its own query rather than
    // the `downloaded = 0` set — a question is playable without it.
    for (const q of db.getAllSync<{ id: number; correction_audio_key: string }>(
      `SELECT id, correction_audio_key FROM questions
        WHERE correction_audio_key IS NOT NULL AND correction_audio_path IS NULL`,
    )) {
      jobs.push({
        key: q.correction_audio_key,
        sql: "UPDATE questions SET correction_audio_path = ? WHERE id = ?",
        id: q.id,
      });
    }
    for (const s of db.getAllSync<{ id: number; image_key: string }>(
      "SELECT id, image_key FROM lesson_signs WHERE image_path IS NULL",
    )) {
      jobs.push({
        key: s.image_key,
        sql: "UPDATE lesson_signs SET image_path = ? WHERE id = ?",
        id: s.id,
      });
    }
    for (const s of db.getAllSync<{ id: number; audio_key: string }>(
      "SELECT id, audio_key FROM lesson_signs WHERE audio_key IS NOT NULL AND audio_path IS NULL",
    )) {
      jobs.push({
        key: s.audio_key,
        sql: "UPDATE lesson_signs SET audio_path = ? WHERE id = ?",
        id: s.id,
      });
    }
    for (const l of db.getAllSync<{ id: number; image_key: string }>(
      "SELECT id, image_key FROM lessons WHERE image_key IS NOT NULL AND image_path IS NULL",
    )) {
      jobs.push({
        key: l.image_key,
        sql: "UPDATE lessons SET image_path = ? WHERE id = ?",
        id: l.id,
      });
    }
    for (const c of db.getAllSync<{ id: number; icon_key: string }>(
      "SELECT id, icon_key FROM lesson_categories WHERE icon_key IS NOT NULL AND icon_path IS NULL",
    )) {
      jobs.push({
        key: c.icon_key,
        sql: "UPDATE lesson_categories SET icon_path = ? WHERE id = ?",
        id: c.id,
      });
    }
    const total = jobs.length;
    let done = 0;
    let failed = 0;
    onProgress?.({ phase: "media", done, total });

    for (const batch of chunk(jobs, MEDIA_BATCH)) {
      let urls: Record<string, string>;
      try {
        const r = await api<{ urls: Record<string, string> }>(
          "/content/media-urls",
          { method: "POST", json: { keys: batch.map((j) => j.key) } },
        );
        urls = r.urls;
      } catch {
        failed += batch.length;
        continue;
      }
      for (const job of batch) {
        try {
          const file = mediaFileFor(job.key);
          if (!file.exists) {
            const url = urls[job.key];
            if (!url) throw new Error("missing url");
            // Local-storage urls are relative — resolve against the API host we
            // are actually talking to (survives changing networks).
            await File.downloadFileAsync(
              url.startsWith("/") ? `${API_URL}${url}` : url,
              file,
            );
          }
          db.runSync(job.sql, file.uri, job.id);
        } catch {
          failed += 1;
        }
        done += 1;
        onProgress?.({ phase: "media", done, total });
      }
    }
    // A question counts as downloaded only when both files are on disk.
    db.runSync(
      "UPDATE questions SET downloaded = 1 WHERE image_path IS NOT NULL AND audio_path IS NOT NULL",
    );

    // 5. Flip the local version ONLY when everything is on disk.
    const remaining =
      db.getFirstSync<{ n: number }>(
        `SELECT (SELECT COUNT(*) FROM questions WHERE downloaded = 0)
              + (SELECT COUNT(*) FROM questions
                  WHERE correction_audio_key IS NOT NULL
                    AND correction_audio_path IS NULL)
              + (SELECT COUNT(*) FROM lesson_signs WHERE image_path IS NULL)
              + (SELECT COUNT(*) FROM lesson_signs
                  WHERE audio_key IS NOT NULL AND audio_path IS NULL)
              + (SELECT COUNT(*) FROM lessons
                  WHERE image_key IS NOT NULL AND image_path IS NULL)
              + (SELECT COUNT(*) FROM lesson_categories
                  WHERE icon_key IS NOT NULL AND icon_path IS NULL) AS n`,
      )?.n ?? 0;
    if (failed === 0 && remaining === 0) {
      setMeta("content_version", String(manifest.version));
      if (newEtag) setMeta("manifest_etag", newEtag);
      setMeta("last_sync", new Date().toISOString());
      // Only now are the new columns actually populated from the server.
      setMeta("synced_schema_version", String(LOCAL_SCHEMA_VERSION));
      return "synced";
    }
    return "partial";
  } catch {
    return "offline";
  } finally {
    running = false;
  }
}

// Foreground trigger, throttled to once per hour (architecture skill).
export async function maybeSyncOnForeground(): Promise<void> {
  const last = getMeta("last_sync");
  if (last && Date.now() - new Date(last).getTime() < FOREGROUND_THROTTLE_MS) {
    return;
  }
  await runSync();
}

export function hasLocalContent(): boolean {
  return getMeta("content_version") !== null;
}

// Repair button ("إعادة تحميل المحتوى"): wipe ALL local content + downloaded
// media, then run a full resync from scratch. Attempts are preserved — they are
// the user's own history and may still be unsynced.
export async function wipeAndResync(
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  db.withTransactionSync(() => {
    db.runSync("DELETE FROM questions");
    db.runSync("DELETE FROM series");
    db.runSync("DELETE FROM lesson_signs");
    db.runSync("DELETE FROM lessons");
    db.runSync("DELETE FROM lesson_categories");
    // Forget sync bookkeeping so the next run refetches everything.
    db.runSync(
      "DELETE FROM meta WHERE key IN ('content_version','manifest_etag','last_sync')",
    );
  });

  // Delete downloaded media so files are re-fetched (frees stale/corrupt files).
  try {
    const mediaDir = new Directory(Paths.document, "media");
    if (mediaDir.exists) mediaDir.delete();
  } catch {
    // ignore — sync re-downloads whatever is missing
  }

  return runSync(onProgress);
}
