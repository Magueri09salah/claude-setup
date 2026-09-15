/**
 * The canonical form of a username.
 *
 * Usernames may contain SPACES (owner decision 2026-09-15): candidates
 * register under their real name, "salah magueri", not a handle. That makes
 * this function load-bearing rather than cosmetic, because the username is a
 * LOGIN IDENTIFIER — "Salah  Magueri" and "salah magueri" have to resolve to
 * the same account, or a candidate who types one space too many is locked out
 * of a registration they completed correctly.
 *
 * Both sides of that equation call this: the register schema on the way in and
 * the login lookup on the way back. Keep it that way — a second, slightly
 * different normalizer anywhere else is a lockout waiting to happen.
 */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
