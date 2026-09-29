// Moroccan numbers are written every possible way — 0612345678, +212612345678,
// 00212 612 345 678, 212-612345678. The allowlist only works if the admin's
// spelling and the candidate's spelling collapse to the same string, so every
// phone that is stored or compared goes through here first.
//
// Canonical form = local Moroccan: 0 followed by 9 digits.

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Country code, with or without the trunk 0 that some people keep.
  if (digits.startsWith("212")) digits = `0${digits.slice(3)}`;
  // 9 digits means the leading 0 was dropped (612345678).
  if (digits.length === 9 && !digits.startsWith("0")) digits = `0${digits}`;

  return digits;
}

/** Moroccan mobile: 0 + (6|7) + 8 digits. */
export function isValidMoroccanMobile(normalized: string): boolean {
  return /^0[67]\d{8}$/.test(normalized);
}

/**
 * Anything the owner may put on the free-access list (owner decision
 * 2026-09-29). Deliberately NOT isValidMoroccanMobile.
 *
 * Some candidates only ever reach the school through WhatsApp, which now hides
 * the real number behind an opaque account id — "MA.2233788760737664",
 * "+MA.828722236986328". normalizePhone strips the letters and the dot, so what
 * lands here is 15-16 digits instead of the Moroccan 10. The owner wants those
 * on the list, so the only rule left is "digits, plausible length".
 *
 * REGISTRATION USES THIS SAME WINDOW ON PURPOSE. The allowlist only grants
 * premium when a candidate signs up with a phone that normalizes to the stored
 * string, so a row the register screen would refuse could never be claimed —
 * the entry would sit there forever looking like a bug. If you ever tighten one
 * of the two, tighten both.
 *
 * The SUPPORT number is not covered by this: it has to be dialable, so
 * settings-admin keeps isValidMoroccanMobile.
 */
export function isAcceptableIdentifier(normalized: string): boolean {
  return /^\d{6,24}$/.test(normalized);
}

/**
 * Spellings a phone could already be stored as, for matching rows written
 * before normalization existed. Used only for lookups, never for writes.
 */
export function phoneVariants(normalized: string): string[] {
  if (!/^0\d{9}$/.test(normalized)) return [normalized];
  const national = normalized.slice(1); // 612345678
  return [
    normalized,
    national,
    `212${national}`,
    `+212${national}`,
    `00212${national}`,
  ];
}
