# Moroccan Driving Education App — Project Memory

## What this is
Driving-license exam prep app (Morocco, Arabic/Darija, RTL). Monorepo:
- `/mobile` — Expo (React Native) + TypeScript + Expo Router. Offline-first.
- `/api` — Express + TypeScript + Prisma + PostgreSQL.
- `/admin` — React + Vite + TypeScript + Mantine. Web admin panel.

## Skills — read the relevant one BEFORE coding in its area
- `architecture` — Prisma schema (source of truth), API endpoints, sync engine, folder structure. Read before ANY backend/schema/sync work.
- `ui-design` — design system: tokens, colors, typography, components, motion. Read before creating ANY screen or component.
- `quiz-engine` — exact quiz rules (timer, toggles, scoring, results). Read before touching quiz/results/progress.
- `sync-payments` — Payzone/Wafacash flows, premium gating, webhook rules. Read before payment work.
- `security` — non-negotiable security checklist. Read at the START of every milestone.

## Docs (reference, do not load unless asked)
- `docs/PRD.md` — product requirements, features F1–F9, metrics.

## Commands
- Mobile dev: `cd mobile && npx expo start`
- API dev: `cd api && npm run dev` · migrate: `npx prisma migrate dev`
- Admin dev: `cd admin && npm run dev`
- Typecheck all: `npm run typecheck` (run after every task, fix all errors)

## Hard rules (always)
- TypeScript strict everywhere. Validate all API input with zod.
- RTL-first: every mobile screen must work in RTL with Arabic text.
- Mobile learning screens load media from LOCAL paths only — never remote URLs.
- Premium is granted ONLY server-side, never by the client: the verified payment
  webhook, or the admin phone allowlist (PremiumPhone, audited). See sync-payments.
- Secrets in .env only (keep .env.example updated). Never commit secrets.
- DB stores UTC; display timezone Africa/Casablanca.
- After each milestone: typecheck, summarize what was built + how to test it.

## Milestones (work strictly one at a time)
M1 api: schema+auth+R2+admin guards · admin: login, Series, QuestionEditor, Publish
M2 mobile: init, RTL, auth screens, Home, SQLite, sync engine (resumable)
M3 mobile: quiz engine + results + attempts + progress
M4 lessons: block renderer (mobile) + LessonEditor (admin).
   MANDATORY: apply the ui-design skill to EVERY lessons screen — category grid,
   sub-category cards, and all 5 block types (IMAGE/TEXT/LIST/INFOBOX/AUDIO) must
   use design tokens only (no hex literals), the component recipes, and pass the
   ui-design consistency checklist. Design is a deliverable of M4, not a polish pass.
M5 payments (MOCK PHASE — gateway credentials not yet received):
   full structure with a MockProvider behind a PaymentProvider interface;
   mobile payment screens (choose card / Wafacash cash code) as FINAL UI;
   premium gating end-to-end; webhook route + idempotent handler;
   + admin Users page (all registered users w/ payment status badge, filters)
   + admin Payments page (transactions, pending Wafacash codes)
   + admin "mark as paid" manual confirmation (audited) = simulates the webhook
   PayzoneProvider stays a TODO stub until the client provides merchant docs.
M6 lives: CRUD + cron + Expo push + home banner
   + admin Dashboard (users, revenue, attempts, push reach)
     [Users + Payments pages already delivered in M5 — do not rebuild]
   + mobile settings: "إعادة تحميل المحتوى" repair button (wipe local + full resync)
   + privacy policy page (Arabic + French, law 09-08 basics) as static HTML for the domain
   + RTL/Arabic audit, EAS build profiles, store submission checklist

## Current status
<!-- UPDATE THIS after each milestone, keep 3 lines max -->
M6 done, reworked 2026-08-05: lives are a DAILY recurring appointment (LiveSettings singleton = 4 profile links + startTime HH:mm Casablanca; admin = one settings form; mobile = countdown ring + 4 blinking platform buttons under the series; push → /lives). LiveEvent CRUD + replays dropped. Also: per-question correction (text + optional MP3) shown only in end-of-quiz review; quiz pause (timer + audio); audio stops on screen blur. Devices push-token, Dashboard, repair resync, /legal/privacy.html, EAS profiles unchanged; remote push still needs a real EAS projectId + FCM creds.
2026-08-07: series now carry a LICENCE CATEGORY (B car = default, A moto, C truck, D bus).
Admin Series page has a tab per licence + a category field; orderNum restarts at 1 per
category, so ALWAYS scope series queries by category. Mobile: /exam?category=A|C|D, and
the home "سلاسل الدروس" card links to whichever categories have content.
Also: per-question timer is a user setting (10/20/30s, `meta.quiz_seconds`).
2026-08-07: lessons have a KIND — SIGNS (flashcard grid, synced offline) or VIDEOS
(المركبة: mp4 uploads, max 500MB, STREAMED via signed url + HTTP Range, never added
to the offline bundle). Lessons also carry an optional cover image used as their card.
M1–M5 complete (payments in mock phase; Night Drive mobile design, shadcn admin; Expo SDK 54).
2026-08-13: NO in-app payment. A locked item opens an unlock screen whose only
action is a WhatsApp button (number in AppSettings, set on the admin المجموعة
المجانية page); the owner then adds the caller's number to the allowlist and the
API grants premium. Mobile payment screens deleted; API payment module + admin
Payments page kept, unreachable, for a future gateway.
Also: الشق التطبيقي (flat list of streamed practical videos, admin page + home
card), Excel/PDF export on users + allowlist, quiz timer starts after the
question audio ends and pause freezes only the timer, image viewer with
rotate-to-landscape and pinch zoom.
2026-08-14: IDENTITY CHANGED. Candidates register with `username` + `phone` +
password (no email, no full name) and LOG IN WITH THEIR PHONE. `User.username`
is unique/lowercased, free-form like "salah@magueri"; `User.email` is now
nullable and kept only for existing accounts + the seeded admin. `/auth/login`
takes ONE `identifier` field resolved against phone (normalized) | username |
email, which is how the admin panel still signs in with its email. Existing
accounts were backfilled with username = email so nobody was locked out.
Registration also takes `cinLast3` (last 3 digits of the ID card, hashed) and
there is a phone-based password reset: /auth/forgot/verify then /forgot/reset,
3 wrong codes = 24h lockout, throttled PER PHONE in `PasswordResetAttempt`
(atomic increment before the bcrypt compare; one identical error for every
failure; single-use token). Existing accounts have no cinLast3 and cannot
self-reset.
2026-08-18: COURSE REQUESTS (lead capture). Mobile home card "التسجيل في الدروس"
→ /courses: city picker (static list in `mobile/src/courses/cities.ts`, 81 cities,
searchable, offline) + a docked واتساب button. Pressing it POSTs
/course-requests {city} (upsert on userId+city, so re-pressing refreshes the lead
instead of duplicating) then opens wa.me with a city-specific message; a failed
POST never blocks the chat. Admin "طلبات التسجيل" page = leads + per-city counts,
status PENDING/CONTACTED/ENROLLED/CANCELLED (audited), note, Excel/PDF export.
2026-08-19: SHOP. `Product` (title, description, price Decimal MAD, imageKey,
isActive, orderNum). Admin "المتجر" page = card grid + add/edit dialog (image
≤5MB webp/png/jpg, immutable keys) + show/hide switch + delete. Mobile home card
"المتجر" → /shop: product grid, tap opens a detail sheet with the picture, price
and description, and an "اطلبه عبر واتساب" button (message names the product).
Like the videos, shop images are signed on demand and NEVER added to the offline
bundle. Multipart booleans use a string-safe schema — z.coerce.boolean() makes
"false" true, which silently broke hiding.
2026-08-19: per-question `correctionHidden` switch (admin question editor,
"إخفاء التصحيح عن المترشح"). ON = the review screen renders nothing even though
the text/MP3 stay stored, so an explanation can be drafted before going live.
Ships to phones in the questions payload; LOCAL_SCHEMA_VERSION bumped to 3 so
installed apps re-pull instead of sitting on a 304 with a stale flag.
2026-08-26: ASSISTANT role (staff helper). Panel access is fail-closed in
`admin.router`: requireStaff → the two assistant routers (users-admin, allowlist)
→ requireAdmin → everything else, so a NEW admin route is owner-only until it is
deliberately moved above the line. Assistant sees only المستخدمون + المجموعة
المجانية (no publish button, no WhatsApp-number card, owner-only URLs redirect).
The users list + premium toggle were split out of payments-admin into
`users-admin.router.ts` so the assistant gets them without the payment routes.
2026-08-26: SUBSCRIPTIONS EXPIRE AFTER 3 MONTHS. `premium/duration.ts` is the
single source (`PREMIUM_MONTHS = 3`, calendar months with an end-of-month clamp);
EVERY grant path uses `extendPremium()` — allowlist claim, admin toggle, payment
webhook — so nothing hands out lifetime access any more. Renewing while still
active ADDS to the remaining time; renewing after expiry starts 3 months from
today. Admin المستخدمون: "منتهي" status + filter + expired counter, a
"الاشتراك" column (days left, orange under 14), a "تجديد 3 أشهر" button per row
(POST /admin/users/:id/renew, audited `renew_premium`) — the assistant can renew
too. Expiry needs NO cron: every check is `isPremium && premiumUntil > now`, and
the manifest ETag flips p1→p0 so phones re-sync and delete premium content.
Do NOT add a job that flips isPremium=false — that erases the "expired" state.
Renewal is MANUAL and lives on both admin pages: المستخدمون row button
(POST /admin/users/:id/renew) and المجموعة المجانية row button
(POST /admin/allowlist/:id/renew — needed because re-adding a listed number is
refused as a duplicate); both show days-left and audit as `renew_premium`.
NOTE: accounts granted before 2026-08-26 have premiumUntil = null = LIFETIME and
never expire; converting them to a 3-month term is a deliberate data change the
owner has not asked for yet.
Next: PayzoneProvider when merchant docs arrive · store submission.
