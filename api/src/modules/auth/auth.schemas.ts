import { z } from "zod";
import { normalizePhone } from "../premium/phone";

export const registerSchema = z.strictObject({
  fullName: z.string().trim().min(3).max(100),
  email: z.email(),
  password: z.string().min(8).max(72),
  // People type numbers with spaces, dashes and country codes — accept all of
  // it and normalize, then validate the canonical form. A too-strict regex
  // here silently blocked group members whose number WAS on the allowlist.
  phone: z
    .string()
    .trim()
    .max(24)
    .transform(normalizePhone)
    .refine((p) => /^\d{6,15}$/.test(p), "Invalid phone number")
    .optional(),
});

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1).max(72),
});

export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(20),
});
