import { Directory, File, Paths } from "expo-file-system";
import { api, apiFetch } from "../api/client";
import type { ApiQuestion, Manifest } from "../api/types";
import { db, getMeta, setMeta, type QuestionRow } from "../db";

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
      db.runSync(
        `INSERT INTO questions
           (id, series_id, order_num, answers_count, correct_answers,
            image_key, audio_key, image_path, audio_path, downloaded, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           series_id = excluded.series_id,
           order_num = excluded.order_num,
           answers_count = excluded.answers_count,
           correct_answers = excluded.correct_answers,
           image_key = excluded.image_key,
           audio_key = excluded.audio_key,
           image_path = excluded.image_path,
           audio_path = excluded.audio_path,
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

    // 1. Manifest with If-None-Match.
    const storedEtag = getMeta("manifest_etag");
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
          `INSERT INTO series (id, title, order_num, is_premium, locked, question_count)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             order_num = excluded.order_num,
             is_premium = excluded.is_premium,
             locked = excluded.locked,
             question_count = excluded.question_count`,
          s.id,
          s.title,
          s.orderNum,
          s.isPremium ? 1 : 0,
          s.locked ? 1 : 0,
          s.questionCount,
        );
      }
      // Locked (premium, unentitled) series keep their teaser row but no content.
      const lockedIds = manifest.series.filter((s) => s.locked).map((s) => s.id);
      if (lockedIds.length > 0) {
        const ph = lockedIds.map(() => "?").join(",");
        db.runSync(`DELETE FROM questions WHERE series_id IN (${ph})`, ...lockedIds);
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

    // 4. Download missing media, batching signed URLs 20 keys at a time.
    const pending = db.getAllSync<QuestionRow>(
      "SELECT * FROM questions WHERE downloaded = 0",
    );
    const jobs: { questionId: number; key: string; kind: "image" | "audio" }[] = [];
    for (const q of pending) {
      jobs.push({ questionId: q.id, key: q.image_key, kind: "image" });
      jobs.push({ questionId: q.id, key: q.audio_key, kind: "audio" });
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
            await File.downloadFileAsync(url, file);
          }
          db.runSync(
            `UPDATE questions SET ${job.kind === "image" ? "image_path" : "audio_path"} = ? WHERE id = ?`,
            file.uri,
            job.questionId,
          );
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
        "SELECT COUNT(*) AS n FROM questions WHERE downloaded = 0",
      )?.n ?? 0;
    if (failed === 0 && remaining === 0) {
      setMeta("content_version", String(manifest.version));
      if (newEtag) setMeta("manifest_etag", newEtag);
      setMeta("last_sync", new Date().toISOString());
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
