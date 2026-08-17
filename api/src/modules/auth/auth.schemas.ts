import { z } from "zod";
import { normalizePhone } from "../premium/phone";

// A handle, not an email: the owner's example is "salah@magueri". Letters,
// digits and . _ - @ only, so it stays typeable and unambiguous in a url.
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9._@-]+$/, "اسم المستخدم يقبل الحروف والأرقام و . _ - @ فقط")
  // Case-insensitive identity: stored lowercase so "Salah" and "salah" are one.
  .transform((v) => v.toLowerCase());

// People type numbers with spaces, dashes and country codes — accept all of it
// and normalize, then validate the canonical form. A too-strict regex here once
// silently blocked group members whose number WAS on the allowlist.
export const phoneSchema = z
  .string()
  .trim()
  .max(24)
  .transform(normalizePhone)
  .refine((p) => /^\d{6,15}$/.test(p), "رقم هاتف غير صالح");

export const registerSchema = z.strictObject({
  username: usernameSchema,
  // REQUIRED now: it is both the login identifier and what the owner matches
  // against the free-access allowlist.
  phone: phoneSchema,
  password: z.string().min(8).max(72),
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
