import { rateLimit } from "express-rate-limit";

// Security checklist: /auth/* limited to 10 requests/min/IP.
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, try again in a minute" },
});
