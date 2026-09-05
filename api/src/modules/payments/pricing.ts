import { env } from "../../env";

// Single source for the PRICE. The access TERM is not here — every grant path
// uses premium/duration.ts (three months), so a gateway, the allowlist and the
// admin button cannot drift apart.
export const PRICING = {
  amount: env.PRICE_AMOUNT,
  currency: env.PRICE_CURRENCY,
  durationDays: env.PRICE_DURATION_DAYS, // 0 = lifetime
} as const;

// Public pitch text for the mobile payment screen.
export function pricingLabel(): string {
  return PRICING.durationDays <= 0
    ? "وصول كامل مدى الحياة"
    : `وصول كامل لمدة ${PRICING.durationDays} يوم`;
}
