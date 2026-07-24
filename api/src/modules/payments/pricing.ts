import { env } from "../../env";

// Single source for price + access duration. Placeholder values live in env;
// the client confirms final pricing later. Screens NEVER hardcode the amount.
export const PRICING = {
  amount: env.PRICE_AMOUNT,
  currency: env.PRICE_CURRENCY,
  durationDays: env.PRICE_DURATION_DAYS, // 0 = lifetime
} as const;

export function premiumExpiryFromNow(): Date | null {
  if (PRICING.durationDays <= 0) return null; // lifetime
  return new Date(Date.now() + PRICING.durationDays * 24 * 60 * 60 * 1000);
}

// Public pitch text for the mobile payment screen.
export function pricingLabel(): string {
  return PRICING.durationDays <= 0
    ? "وصول كامل مدى الحياة"
    : `وصول كامل لمدة ${PRICING.durationDays} يوم`;
}
