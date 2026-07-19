# PRD — Moroccan Driving Education App
**Version:** 1.0 · **Date:** July 2026 · **Status:** Draft for development

---

## 1. Overview

A mobile application (iOS + Android) that helps candidates prepare for the Moroccan
driving license theory exam (permis catégorie B, extensible to C/D). The app offers
exam-style question series with images and Darija audio, structured theory lessons,
progress tracking, and works **fully offline after content sync**. Premium content is
unlocked via online card payment or cash payment at Wafacash agencies. The founder's
social media audience is converted into app users through in-app announced live
teaching sessions.

**Competitive reference:** Siya9a 2026, Siya9ati — same category; differentiation
through content quality, live sessions integration, and cash-payment accessibility.

## 2. Goals & Success Metrics

| Goal | Metric | Target (6 months) |
|---|---|---|
| Acquisition | Installs | 50,000 |
| Activation | Users completing ≥1 full series | 40% of installs |
| Monetization | Free → premium conversion | 5–8% |
| Payment mix | Wafacash share of payments | expected ≥50% (unbanked users) |
| Retention | D30 retention | 25% |
| Engagement | Live notification → open rate | 30% |
| Outcome | Users reporting exam success | tracked via in-app survey |

## 3. Target Users

- **Primary:** driving license candidates in Morocco, 18–35, Arabic/Darija speakers,
  Android-majority, price-sensitive, often limited mobile data, many without bank cards.
- **Secondary:** driving schools recommending the app; drivers refreshing knowledge.

## 4. Platforms & Constraints

- React Native (Expo) — one codebase for iOS + Android. RTL-first UI, Arabic/Darija.
- Offline-first: all learning features must work with zero connectivity after sync.
- Data-sensitive: full content pack ≤ 200 MB (WebP images, 64 kbps audio).
- Apple policy: digital content on iOS may require Apple In-App Purchase; Payzone /
  Wafacash offered on Android (+ web later). Decision needed before iOS submission.

## 5. Features

### F1 — Authentication (must-have)
- Register/login with email or phone + password. JWT sessions, refresh tokens.
- Requires internet. Session persists; app opens directly to Home afterwards.
- Device limit: max 2 active devices per account (anti-sharing).

### F2 — Content Sync & Offline Mode (must-have)
- On online launch: manifest check (ETag/304) → incremental download of new/changed
  content only → SQLite + local media files → progress bar on first sync.
- Resumable downloads; content version flips only when the full pack is on disk.
- App fully functional offline afterwards. "Repair content" button in settings.

### F3 — Exam Series (must-have)
- N series × 40 questions. Each question = one composed image (photo + text +
  options) + one Darija audio narration, mirroring the official exam format.
- Quiz engine: 30s timer per question, toggle buttons (1–4), multi-answer support,
  ✓ confirm / auto-submit on timeout, exact-set scoring (no partial credit).
- Results: score /40, pass mark 32, color-coded per-question review with the user's
  choices vs correct answers. Attempts saved locally (and synced when online).

### F4 — Theory Lessons (must-have)
- Hierarchical categories (e.g. التشوير الطرقي → علامات المنع) → lessons composed of
  ordered content blocks: image, text, list, info-box, audio.
- Rendered natively; fully offline after sync.

### F5 — Freemium & Payments (must-have)
- Free tier: limited series + selected lessons. Premium: everything.
- **Online payment:** Payzone hosted page in in-app browser; server-side webhook
  verification; app polls payment status.
- **Cash payment:** generated unique code (e.g. DRV-8F3K2A), 72h validity, paid at
  any Wafacash agency; confirmation via Payzone/Wafacash webhook; single-use.
- Premium status enforced server-side (manifest filtering + signed media URLs).
- Locked premium items visible as teasers (🔒) to drive conversion.

### F6 — Progress Tracking (should-have)
- Per-series best score & history, pass/fail record, overall stats, weakest series.
- Works offline from local attempts.

### F7 — Live Sessions & Push Notifications (should-have)
- Admin schedules a live (title, platform, URL, datetime — Africa/Casablanca).
- Push notifications: reminder at T-15min and "live started" at T-0; manual
  "notify now" option. Tap → opens YouTube/Facebook/TikTok/Instagram natively.
- Home-screen banner: upcoming live countdown / 🔴 live-now / replay link.
- Notification policy: lives + content updates only. No promotional spam.

### F8 — Admin Panel (must-have, web)
- Question editor: image + audio upload, answers count, correct-answer checkboxes,
  series & order, premium flag.
- Lesson editor: block-based (add/reorder image/text/list/infobox/audio).
- Publish button (content version bump → triggers user syncs).
- Lives management, users list (premium status, block), payments & pending codes,
  dashboard (installs, revenue, attempts, push reach).

### F9 — Future / v2 (nice-to-have)
- Replay library of past lives; exam simulator mode (random 40 across all series);
  categories C/D; French language toggle; referral codes; driving-school B2B accounts.

## 6. Non-Functional Requirements

- **Performance:** quiz screens load media from disk only; cold start < 3s.
- **Reliability:** sync resumable & idempotent; no partial content states.
- **Security:** bcrypt/argon2 passwords; short-lived JWT; webhook signature checks;
  signed URLs for premium media; rate limiting on auth & payments; codes expire.
- **Compliance:** Moroccan law 09-08 (personal data / CNDP declaration); store
  policies; content disclaimer: independent educational app, official source NARSA.
- **Content pipeline:** all questions/images/audio are original or licensed —
  no copying from existing apps (Siya9a, Code Rousseau).

## 7. Tech Summary

Mobile: Expo + TypeScript, SQLite, expo-file-system, expo-audio, expo-notifications.
Backend: Node.js (Express/NestJS) + Prisma + PostgreSQL; node-cron; Expo Push API.
Media: Cloudflare R2 + CDN, immutable keys, WebP/64kbps MP3.
Admin: React (Vite) web app, same API, role-gated.
Hosting: Railway/Render (API+DB), Cloudflare Pages (admin), R2 (media).

## 8. Milestones

| # | Milestone | Scope | Weeks |
|---|---|---|---|
| M1 | Backend + Admin core | Auth, schema, uploads, question editor | 1–2 |
| M2 | Mobile foundation | Auth screens, home, sync engine, SQLite | 3–4 |
| M3 | Quiz | Engine, results, attempts, progress | 5 |
| M4 | Lessons | Block renderer + lesson editor | 6 |
| M5 | Payments | Payzone sandbox → production, Wafacash codes, gating | 7 |
| M6 | Lives + polish | Push, banner, cron; RTL audit; EAS builds; store submission | 8 |
| M7 | Content production | Parallel track from M1: series images + audio recording | 1–8 |

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Payzone/Wafacash integration differs from assumptions | Contact Payzone in week 1; get merchant account + API docs before M5 |
| Apple rejects external payments on iOS | Plan IAP variant or Android-first launch |
| Content production slower than code | Start content pipeline at M1; it is the critical path |
| Account sharing erodes revenue | Device limit + periodic online license re-check (30 days) |
| Notification opt-out | Strict notification budget; value-first messages |
| Copyright claims from competitors | 100% original content; legal review of assets |

## 10. Open Questions

1. Premium pricing: one-time lifetime vs 6-month access? (competitors ≈ 30–100 MAD)
2. iOS strategy: IAP from day one, or Android-first launch?
3. Free tier size: how many free series/lessons converts best? (A/B test later)
4. Phone-number auth (OTP via SMS) instead of email — higher cost, lower friction?
