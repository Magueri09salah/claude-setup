import { z } from "zod";

export const registerSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(8).max(72),
  phone: z
    .string()
    .regex(/^\+?[0-9]{6,15}$/, "Invalid phone number")
    .optional(),
});

export const loginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1).max(72),
});

export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(20),
});
