import crypto from "node:crypto";

// Wafacash code: DRV-XXXXXX, crypto-random, no ambiguous chars (O/0/I/1),
// single-use + 72h expiry enforced in the service layer (security checklist).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,0,I,1

export function generateCashCode(): string {
  const bytes = crypto.randomBytes(6);
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `DRV-${body}`;
}

export const CASH_CODE_TTL_MS = 72 * 60 * 60 * 1000;
