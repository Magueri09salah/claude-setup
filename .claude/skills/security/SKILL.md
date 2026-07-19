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
