import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
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
