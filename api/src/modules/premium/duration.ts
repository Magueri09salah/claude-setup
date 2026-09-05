/**
 * How long an access grant lasts (owner decision 2026-08-26): three months,
 * after which the candidate contacts the school again and the admin renews.
 *
 * One source of truth for every grant path — the allowlist, the admin toggle
 * and the renew button — so changing the term is a one-line edit here.
 */
export const PREMIUM_MONTHS = 3;

/**
 * `base` + PREMIUM_MONTHS calendar months, clamped to a real date.
 *
 * Calendar months, not 90 days, because "ينتهي 26 نوفمبر" is what the owner
 * tells the candidate on WhatsApp. The clamp handles 30 Nov + 3 → 28/29 Feb,
 * which plain setMonth would silently roll into March.
 */
export function addPremiumMonths(base: Date): Date {
  const d = new Date(base);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + PREMIUM_MONTHS);
  const lastDayOfTarget = new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
  ).getDate();
  d.setDate(Math.min(day, lastDayOfTarget));
  return d;
}

/**
 * The new expiry when access is granted or renewed.
 *
 * Renewing an account that is still running ADDS to what is left rather than
 * restarting it, so someone who renews early is never punished for it. An
 * expired (or brand new) account simply starts three months from today.
 */
export function extendPremium(
  current: Date | null | undefined,
  now: Date = new Date(),
): Date {
  const base = current && current > now ? current : now;
  return addPremiumMonths(base);
}
