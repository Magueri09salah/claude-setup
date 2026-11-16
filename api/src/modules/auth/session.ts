import type { User } from "@prisma/client";
import type { Request } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";

/**
 * One phone per candidate account (owner decision 2026-11-02): the LAST login
 * wins. Each candidate login writes a new `User.sessionKey` and stamps it into
 * both tokens as `sk`; a token carrying any other key belongs to a phone that
 * has since been signed out.
 *
 * Checked in two places that must agree: `requireAuth` (every request) and
 * `refresh` (so the old phone cannot simply mint new tokens).
 *
 * Staff are exempt, so the owner can stay signed in to the panel and the app at
 * the same time. A NULL key means nobody has logged in since the rule shipped,
 * and those sessions keep working until the next login.
 */
export const SESSION_REPLACED = "SESSION_REPLACED";

export function sessionReplacedError(): ApiError {
  return new ApiError(401, "تم تسجيل الدخول إلى حسابك من هاتف آخر", SESSION_REPLACED);
}

export function isSessionReplaced(
  user: Pick<User, "role" | "sessionKey">,
  tokenKey: unknown,
): boolean {
  return user.role === "USER" && user.sessionKey !== null && tokenKey !== user.sessionKey;
}

/** The key to stamp into a user's tokens: candidates only. */
export function tokenSessionKey(user: Pick<User, "role" | "sessionKey">): string | null {
  return user.role === "USER" ? user.sessionKey : null;
}

/**
 * FIRST PHONE WINS (owner decision 2026-11-16, on top of the rule above).
 * A candidate account is tied to the first phone that signs in with it
 * (`User.boundDeviceId`), and any other phone is refused at LOGIN — the phone
 * that already holds the account is never disturbed. Students were handing
 * their phone number and password to friends; with "last login wins" alone the
 * friend could still take the account over.
 *
 * Owner accepted the cost: a student who changes, loses or resets their phone
 * is locked out of the account. Logging out does NOT free it, or "log out and
 * hand it over" would be the obvious workaround.
 *
 * The phone id comes from the app as the `X-Device-Id` header (a header, not a
 * body field, because the auth bodies are strictObject: an app sending a new
 * field to a server not yet redeployed would be refused outright). Android
 * sends its Android ID, which survives a reinstall; iOS sends an id kept in the
 * keychain. Stored hashed. A modified app can lie about it — this stops the
 * ordinary case, a friend typing the student's number and password.
 *
 * Apps before this shipped send no id. They can still sign into an account
 * that is not tied yet (last login wins, as before) but never into a tied one,
 * since they cannot show they are that phone.
 */
export const DEVICE_BOUND = "DEVICE_BOUND";

/** 403 at login (shown on the form), 401 at refresh (ends that phone's session). */
export function deviceBoundError(status: 401 | 403): ApiError {
  return new ApiError(status, "هذا الحساب مرتبط بهاتف آخر", DEVICE_BOUND);
}

// "android:<Android ID>", "ios:<keychain id>", or "device:<random>" fallback.
const deviceIdSchema = z
  .string()
  .trim()
  .regex(/^(android|ios|device):[A-Za-z0-9-]{4,64}$/, "Invalid X-Device-Id");

/** The calling phone's id, or null for an app that does not send one. */
export function readDeviceId(req: Request): string | null {
  const raw = req.get("x-device-id");
  return raw === undefined ? null : deviceIdSchema.parse(raw);
}
