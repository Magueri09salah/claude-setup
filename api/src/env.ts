import "dotenv/config";
import { z } from "zod";

// Empty strings in .env count as "not set" (e.g. blank R2 vars).
const optionalVar = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  MEDIA_SIGNING_SECRET: z.string().min(32),
  APP_BASE_URL: optionalVar,
  R2_ACCOUNT_ID: optionalVar,
  R2_ACCESS_KEY_ID: optionalVar,
  R2_SECRET_ACCESS_KEY: optionalVar,
  R2_BUCKET: optionalVar,
});

export const env = envSchema.parse(process.env);

export const appBaseUrl = env.APP_BASE_URL ?? `http://localhost:${env.PORT}`;
