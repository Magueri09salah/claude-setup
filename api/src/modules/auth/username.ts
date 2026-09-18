/**
 * The canonical form of a username.
 *
 * Usernames may contain SPACES (owner decision 2026-09-15) and ARABIC (owner
 * decision 2026-09-18): candidates register under their real name, "salah
 * magueri" or "سعد المغاري", not a handle. That makes
 * this function load-bearing rather than cosmetic, because the username is a
 * LOGIN IDENTIFIER — "Salah  Magueri" and "salah magueri" have to resolve to
 * the same account, or a candidate who types one space too many is locked out
 * of a registration they completed correctly.
 *
 * Both sides of that equation call this: the register schema on the way in and
 * the login lookup on the way back. Keep it that way — a second, slightly
 * different normalizer anywhere else is a lockout waiting to happen.
 */
/**
 * Invisible characters that ride along with pasted Arabic. WhatsApp, iOS and
 * most Android keyboards wrap right-to-left text in bidi marks, and a name
 * copied out of a chat carries them. They render as nothing at all, so without
 * this two names that look character-for-character identical would not match,
 * and there would be nothing on screen for the candidate to correct.
 */
const INVISIBLE = /[؜​-‏‪-‮⁦-⁩﻿]/g;

export function normalizeUsername(value: string): string {
  return (
    value
      .replace(INVISIBLE, "")
      // Arabic copied from a PDF or an older system arrives as presentation
      // forms — a second Unicode spelling of the same letters. NFKC folds them
      // back, so ﻣﺤﻤﺪ and محمد are one account and not two.
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
  );
}
