import type { User } from "@prisma/client";
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
