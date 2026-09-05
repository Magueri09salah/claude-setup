import "dotenv/config";
import { z } from "zod";

// Empty strings in .env count as "not set" (e.g. blank R2 vars).
const optionalVar = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().optional(),
);

// "false" is a non-empty string, so z.coerce.boolean() would read it as TRUE
// and silently arm whatever it guards. Parse the words instead.
const boolVar = z
  .preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["true", "false", "1", "0"]).optional(),
  )
  .transform((v) => v === "true" || v === "1");

const envSchema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
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
  /**
   * The whole payment surface — /payments, /webhooks and the mock gateway page
   * — is OFF unless this is explicitly "true".
   *
   * There is no in-app payment any more (owner decision 2026-08-13): access is
   * arranged over WhatsApp and granted from the admin allowlist. Leaving the
   * routes mounted only gave anyone who could register a way to settle their
   * own payment and take three free months. Turn this on again the day a real
   * gateway is wired up.
   */
  PAYMENTS_ENABLED: boolVar,
  // Payments (mock phase). PayzoneProvider plugs in later without screen changes.
  PAYMENT_PROVIDER: z.enum(["mock", "payzone"]).default("mock"),
  // NO default: a secret written in the repo is not a secret. Required only
  // when the mock gateway is actually switched on.
  MOCK_WEBHOOK_SECRET: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(8).optional(),
  ),
  PRICE_AMOUNT: z.coerce.number().positive().default(99),
  PRICE_CURRENCY: z.string().default("MAD"),
  // Access duration in days; 0 = lifetime (placeholder until client confirms).
  PRICE_DURATION_DAYS: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((v, ctx) => {
    if (!v.PAYMENTS_ENABLED) return;
    // Refuse to boot rather than run a fake gateway against real customers.
    if (v.NODE_ENV === "production" && v.PAYMENT_PROVIDER === "mock") {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_PROVIDER"],
        message:
          "The mock payment gateway cannot run in production — set PAYMENT_PROVIDER=payzone or PAYMENTS_ENABLED=false",
      });
    }
    if (v.PAYMENT_PROVIDER === "mock" && !v.MOCK_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["MOCK_WEBHOOK_SECRET"],
        message:
          "MOCK_WEBHOOK_SECRET is required when the mock gateway is enabled (min 8 chars)",
      });
    }
  });

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";

export const appBaseUrl = env.APP_BASE_URL ?? `http://localhost:${env.PORT}`;
