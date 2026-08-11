import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { appBaseUrl, env } from "../env";
import { ApiError } from "../middleware/errors";
import { SIGNED_URL_TTL_SEC, type StorageService } from "./index";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

function assertSafeKey(key: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(key) || key.includes("..")) {
    throw new ApiError(400, "Invalid media key");
  }
}

function sign(key: string, exp: number): string {
  return crypto
    .createHmac("sha256", env.MEDIA_SIGNING_SECRET)
    .update(`${key}:${exp}`)
    .digest("hex");
}

// Dev-only stand-in for R2: same put/signed-URL contract, files on local disk,
// URLs carry an HMAC signature and 15-minute expiry like real signed URLs.
export class LocalStorage implements StorageService {
  readonly kind = "local" as const;

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    assertSafeKey(key);
    const abs = path.join(UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, body);
  }

  // Streams by moving the temp file into place — nothing is read into memory,
  // so a 300MB video costs the same as a 30KB one. Falls back to copy+unlink
  // when the temp dir sits on another volume (rename fails with EXDEV).
  async putFile(key: string, filePath: string, _contentType: string): Promise<void> {
    assertSafeKey(key);
    const abs = path.join(UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    try {
      await fs.rename(filePath, abs);
    } catch {
      await fs.copyFile(filePath, abs);
      await fs.unlink(filePath).catch(() => undefined);
    }
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key);
    try {
      await fs.access(path.join(UPLOADS_DIR, key));
      return true;
    } catch {
      return false;
    }
  }

  // Returns a RELATIVE url when APP_BASE_URL is unset (the dev default), so the
  // link never hardcodes a LAN IP — clients resolve it against the host they
  // already reached the API on. Set APP_BASE_URL in production for absolute urls.
  async getSignedUrl(key: string): Promise<string> {
    assertSafeKey(key);
    const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SEC;
    const sig = sign(key, exp);
    const query = `key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
    return env.APP_BASE_URL
      ? `${appBaseUrl}/media/local?${query}`
      : `/media/local?${query}`;
  }
}

const mediaQuery = z.strictObject({
  key: z.string().min(1),
  exp: z.coerce.number().int(),
  sig: z.string().regex(/^[0-9a-f]{64}$/),
});

export const localMediaRouter = Router();

localMediaRouter.get("/", (req, res) => {
  const q = mediaQuery.parse(req.query);
  assertSafeKey(q.key);
  if (q.exp < Math.floor(Date.now() / 1000)) {
    throw new ApiError(403, "URL expired");
  }
  const expected = Buffer.from(sign(q.key, q.exp));
  const given = Buffer.from(q.sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new ApiError(403, "Invalid signature");
  }
  const abs = path.join(UPLOADS_DIR, q.key);
  if (!abs.startsWith(UPLOADS_DIR + path.sep)) {
    throw new ApiError(400, "Invalid media key");
  }
  res.sendFile(abs, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "Media not found" });
    }
  });
});
