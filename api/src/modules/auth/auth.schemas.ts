import { z } from "zod";
import { normalizePhone } from "../premium/phone";
import { normalizeUsername } from "./username";

// A NAME, not a handle (owner decision 2026-09-15): candidates register as
// "salah magueri", so SPACES are allowed alongside the old handle style
// "salah@magueri". ARABIC too (owner decision 2026-09-18) — "سعد المغاري" is
// how most candidates write their own name, and until now the form refused it.
//
// Latin letters, Arabic (the main block plus the supplements and the
// presentation forms that pasted text arrives in), digits in either script,
// space and . _ - @ — enough for a real name, and nothing that needs escaping
// anywhere it is displayed.
//
// Nothing beyond three characters is REQUIRED: a name with no digit and no
// punctuation in it is the normal case, not a mistake.
const USERNAME_SHAPE =
  /^[A-Za-z0-9؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ._@ -]+$/;

// Normalized FIRST, then measured and shape-checked. The old order did it the
// other way round, which meant a name pasted from WhatsApp — carrying a
// non-breaking space or an invisible bidi mark — was rejected for a character
// the candidate could not see and could not remove.
//
// Case- AND spacing-insensitive identity, because this doubles as a login
// identifier: "Salah  Magueri" and "salah magueri" are one account.
export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .min(3)
      .max(40)
      .regex(
        USERNAME_SHAPE,
        "اسم المستخدم يقبل الحروف والأرقام والمسافة و . _ - @ فقط",
      ),
  );

// People type numbers with spaces, dashes and country codes — accept all of it
// and normalize, then validate the canonical form. A too-strict regex here once
// silently blocked group members whose number WAS on the allowlist.
export const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform(normalizePhone)
  .refine((p) => /^\d{6,15}$/.test(p), "رقم هاتف غير صالح");

// Three digits the candidate CHOOSES at registration and gives back to reset
// their password (owner decision 2026-09-18 — it used to be the last 3 of the
// national ID card, and the screens no longer say so). The column is still
// named cinLast3Hash. Keeping it to three digits is the owner's choice; the
// per-phone reset lockout is what makes it safe, not the length.
export const cinLast3Schema = z
  .string()
  .trim()
  .regex(/^\d{3}$/, "أدخل 3 أرقام لاستعادة كلمة المرور");

export const registerSchema = z.strictObject({
  username: usernameSchema,
  // REQUIRED now: it is both the login identifier and what the owner matches
  // against the free-access allowlist.
  phone: phoneSchema,
  password: z.string().min(8).max(72),
  // Used only to authorise a later password reset.
  cinLast3: cinLast3Schema,
});

export const forgotVerifySchema = z.strictObject({
  phone: phoneSchema,
  cinLast3: cinLast3Schema,
});

export const forgotResetSchema = z.strictObject({
  resetToken: z.string().min(20),
  newPassword: z.string().min(8).max(72),
});

// Candidates sign in with their phone; the admin panel still signs in with its
// email. One field accepting either keeps both working without a second route.
export const loginSchema = z.strictObject({
  identifier: z.string().trim().min(3).max(80),
  password: z.string().min(1).max(72),
});

export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(20),
});
