import { rateLimit } from "express-rate-limit";

// Security checklist: /auth/* limited to 10 requests/min/IP.
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again in a minute" },
});

/**
 * Guest mode (2026-11-12): free content, lives and the push token answer
 * WITHOUT an account, so nothing ties those requests to a user. This caps them
 * per IP. Signed-in requests skip it (they already carry an identity).
 *
 * Deliberately generous: a whole school can share one Wi-Fi IP, and a phone's
 * first download alone is dozens of requests (manifest, questions, media urls
 * in batches of 20). Hitting the cap is harmless anyway: the sync stops short
 * and resumes on its next run, skipping every file already on disk.
 */
export const guestRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.auth !== undefined,
  message: { error: "Too many requests, try again in a minute" },
});

/** Stricter cap for the one guest route that WRITES (the push token). */
export const guestWriteRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.auth !== undefined,
  message: { error: "Too many requests, try again in a minute" },
});
