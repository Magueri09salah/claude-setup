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
- Premium is granted ONLY by the verified payment webhook, never by the client.
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
   + admin Users page (search, premium, device count, block) + Dashboard
     (users, revenue, attempts, push reach)
   + mobile settings: "إعادة تحميل المحتوى" repair button (wipe local + full resync)
   + privacy policy page (Arabic + French, law 09-08 basics) as static HTML for the domain
   + RTL/Arabic audit, EAS build profiles, store submission checklist

## Current status
<!-- UPDATE THIS after each milestone, keep 3 lines max -->
Not started. Next: M1.
