import { z } from "zod";
import { normalizePhone } from "../premium/phone";
import { normalizeUsername } from "./username";

// A NAME, not a handle (owner decision 2026-09-15): candidates register as
// "salah magueri", so SPACES are allowed alongside the old handle style
// "salah@magueri". Letters, digits, space and . _ - @ — enough for a real
// name, and nothing that needs escaping anywhere it is displayed.
//
// Nothing beyond three characters is REQUIRED: a name with no digit and no
// punctuation in it is the normal case, not a mistake.
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(
    /^[A-Za-z0-9._@ -]+$/,
    "اسم المستخدم يقبل الحروف والأرقام والمسافة و . _ - @ فقط",
  )
  // Case- AND spacing-insensitive identity, because this doubles as a login
  // identifier: "Salah  Magueri" and "salah magueri" are one account.
  .transform(normalizeUsername);

// People type numbers with spaces, dashes and country codes — accept all of it
// and normalize, then validate the canonical form. A too-strict regex here once
// silently blocked group members whose number WAS on the allowlist.
export const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform(normalizePhone)
  .refine((p) => /^\d{6,15}$/.test(p), "رقم هاتف غير صالح");

// Last 3 digits of the national ID card. Exactly three digits — keeping it
// short is the owner's choice; the reset lockout is what makes it safe.
export const cinLast3Schema = z
  .string()
  .trim()
  .regex(/^\d{3}$/, "أدخل آخر 3 أرقام من بطاقة التعريف");

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
