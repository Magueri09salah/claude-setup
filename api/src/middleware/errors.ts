import fs from "node:fs/promises";
import type { ErrorRequestHandler, Request } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Delete multipart temp files left behind by a failed request.
 *
 * Video uploads stream to disk (os.tmpdir()) BEFORE the handler can check the
 * mime type or the title, so a rejected 500MB upload used to sit in /tmp until
 * someone noticed the disk was full. On success `storage.putFile` consumes the
 * file itself, so by then there is nothing left to remove and the unlink simply
 * fails harmlessly.
 */
function discardTempUploads(req: Request): void {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files) {
    for (const group of Object.values(req.files)) files.push(...group);
  }
  for (const f of files) {
    // Only disk-backed uploads have a path; memoryStorage ones do not.
    if (f.path) void fs.unlink(f.path).catch(() => undefined);
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Runs for EVERY failed request, so new upload routes are covered too.
  discardTempUploads(req);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      issues: err.issues.map((i) => ({
        path: i.path.map(String).join("."),
        message: i.message,
      })),
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: string }).type === "entity.parse.failed"
  ) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "MulterError"
  ) {
    const code = (err as { code?: string }).code;
    res.status(code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error:
        code === "LIMIT_FILE_SIZE"
          ? "File too large"
          : `Upload rejected (${code ?? "invalid multipart request"})`,
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
