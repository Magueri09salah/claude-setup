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
  /**
   * Interface to bind. Production defaults to 127.0.0.1 so the API is reachable
   * only through nginx — binding every interface would leave port 4000 open to
   * the internet, answering in plain HTTP and bypassing TLS and rate limits.
   * Dev defaults to 0.0.0.0 so a phone on the LAN can reach Metro's API.
   */
  HOST: optionalVar,
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  MEDIA_SIGNING_SECRET: z.string().min(32),
  /**
   * Public origin of the API, INCLUDING the path prefix it is served under —
   * e.g. https://codeboujida.com/api. Absolute signed-media URLs are built from
   * it, so a wrong value hands phones links they cannot fetch. Required in
   * production; dev falls back to localhost.
   */
  APP_BASE_URL: optionalVar,
  /**
   * Comma-separated browser origins allowed to call this API.
   *
   * Empty in production = no cross-origin access at all, which is right when
   * the panel is served from the same domain under /admin. Set it only if the
   * panel ever moves to its own hostname. Native mobile apps are unaffected —
   * they send no Origin header and CORS does not apply to them.
   */
  CORS_ORIGINS: optionalVar,
  /**
   * Escape hatch: allow local-disk media in production.
   *
   * Off by default. Media on the server disk is invisible to the media backup
   * unless the mirror step runs, and it disappears with the machine — so a
   * production box that quietly falls back to disk is a data-loss trap, not a
   * convenience. Set this to "true" only if you deliberately want disk storage.
   */
  ALLOW_LOCAL_STORAGE: boolVar,
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
    // ── Media storage ───────────────────────────────────────────────────────
    // R2 needs all four values. Three correct ones and a typo in the fourth
    // used to mean a silent downgrade to local disk: uploads keep working, old
    // media 404s, and the only clue is one line in a log nobody reads.
    const r2 = {
      R2_ACCOUNT_ID: v.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: v.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: v.R2_SECRET_ACCESS_KEY,
      R2_BUCKET: v.R2_BUCKET,
    };
    const missing = Object.entries(r2)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0 && missing.length < 4) {
      ctx.addIssue({
        code: "custom",
        path: [missing[0]!],
        message: `R2 is partly configured — these are missing or empty: ${missing.join(", ")}. Set all four, or none to use local disk.`,
      });
    }

    if (
      v.NODE_ENV === "production" &&
      missing.length === 4 &&
      !v.ALLOW_LOCAL_STORAGE
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["R2_ACCOUNT_ID"],
        message:
          "No media storage configured. Set the four R2_* values, or ALLOW_LOCAL_STORAGE=true to deliberately store media on the server disk.",
      });
    }

    // Localhost in a production signed URL is a dead link on every phone.
    if (v.NODE_ENV === "production" && !v.APP_BASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_BASE_URL"],
        message:
          "APP_BASE_URL is required in production, e.g. https://codeboujida.com/api",
      });
    }
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

export const bindHost = env.HOST ?? (isProduction ? "127.0.0.1" : "0.0.0.0");

export const appBaseUrl = env.APP_BASE_URL ?? `http://localhost:${env.PORT}`;
