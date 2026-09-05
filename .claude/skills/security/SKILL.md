---
name: security
description: Non-negotiable security checklist for auth, payments, media access, and secrets. Read at the start of every milestone and before any auth, upload, webhook, or admin endpoint work.
---

# Security Checklist (non-negotiable)

- Passwords: bcrypt (cost 12). Auth: JWT access 15min + refresh 30d with rotation;
  refresh tokens stored hashed server-side; revoke on logout.
- Mobile: tokens + premium license in expo-secure-store ONLY (never AsyncStorage).
- Validate EVERY request body/params/query with zod. Reject unknown fields.
- Rate limit: /auth/* (10/min/IP), /payments/* (20/min/user).
- Admin: role=ADMIN middleware on every /admin/* route server-side. The admin SPA
  hiding buttons is NOT security.
- Media: R2 bucket private. Signed URLs (15min expiry) issued only for keys the
  user is entitled to. Free users: free keys only.
- Webhooks: verify gateway signature before ANY state change; idempotent handling
  (same event twice = one effect); log all webhook payloads.
- Wafacash codes: crypto-random, unique, single-use, 72h expiry.
- Devices: max 2 per account (oldest evicted with user confirmation).
- Secrets: .env only, .gitignore'd, .env.example documents every var. Never print
  secrets in logs. Never commit real credentials — check before every commit.
- Uploads (admin): whitelist mime types (webp/png/jpg/mp3), max sizes, re-derive
  extension server-side, never trust client filename.

## Auth identity (owner decision 2026-08-14)
Registration takes `username` + `phone` + password only. Login sends ONE
`identifier`, matched against phone (normalized via modules/premium/phone) OR
username OR email — all unique, so it can never resolve to two accounts.
Keep the constant-time compare against DUMMY_HASH on the miss path: a fast
"no such phone" reply would let anyone enumerate which numbers are registered.
Usernames are stored lowercased so they cannot be duplicated by case.

## Password reset (owner decision 2026-08-14)
Registration also takes `cinLast3` — the last 3 digits of the national ID card,
stored BCRYPT-HASHED as `User.cinLast3Hash`.
Reset is two steps: POST /auth/forgot/verify {phone, cinLast3} returns a
10-minute token carrying `typ:"pwreset"` and a `nonce`; POST /auth/forgot/reset
exchanges it for a new password.

THREE digits is only 1000 combinations, so the throttle is the real control.
Three things it must keep doing — each fixed a live hole:
1. CONSUME THE ATTEMPT BEFORE bcrypt.compare, via a conditional `updateMany`
   whose WHERE clause carries the guard. bcrypt takes ~250ms, so a
   read-compare-write let parallel requests each get a free guess; 10 concurrent
   tries all passed. The DB must decide who gets the attempt.
2. THROTTLE BY PHONE (`PasswordResetAttempt`), not by user. A counter on the
   User row cannot count an unknown number, and that difference told an attacker
   which numbers are registered.
3. ONE MESSAGE, ONE STATUS for every failure — wrong code, unknown phone and
   lockout are indistinguishable. Never return a remaining-attempts count: it is
   itself the enumeration oracle.
The reset token is SINGLE-USE: the nonce is cleared in the same conditional
update that sets the password, so a replay matches no row.
A successful reset revokes every refresh token for that user.
Accepted trade-off: anyone can burn a phone's 3 attempts and block that user's
reset for 24h. Inherent to a per-identifier lockout.
Accounts created BEFORE this (including the seeded admin) have no cinLast3 and
cannot self-reset — change those from the database.
