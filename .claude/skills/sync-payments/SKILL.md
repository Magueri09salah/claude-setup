---
name: sync-payments
description: Payment flows (Payzone online + Wafacash cash codes), premium gating, and webhook rules. Use before any work on payment screens, payment endpoints, webhook handling, or premium content access control.
---

# Payments & Premium Gating

## Iron rule
Premium is granted ONLY by the server after webhook signature verification.
The client can request, poll, and display — never decide. No client-side flag
grants access to premium media (server refuses signed URLs for non-entitled keys).

## Online (Payzone)
POST /payments/online/create → Payment row PENDING + Payzone hosted-page URL →
mobile opens in expo-web-browser → user pays → Payzone calls POST /webhooks/payzone
→ verify signature + amount + currency → status=PAID, paidAt, user.isPremium=true
→ mobile returns from browser and polls GET /payments/:id/status (2s interval,
max 60s, then "check later" state) → on PAID: trigger full sync → premium unlocked.

## Wafacash (cash code)
POST /payments/wafacash/create → generate code `DRV-` + 6 chars (unambiguous set:
no O/0/I/1), unique, single-use, expiresAt = now+72h, PENDING → screen shows code
HUGE + amount + Arabic steps + "تحقق من الدفع" poll button → user pays cash at
agency → gateway webhook carries the reference → match code → PAID → premium.
Cron expires stale PENDING past expiresAt (status=EXPIRED; code unusable).

## Gateway isolation
All gateway calls behind a `PaymentProvider` interface (createSession,
verifyWebhook, parseReference). Exact Payzone/Wafacash API details will come from
their real merchant docs — keep integration swappable; mock provider for dev.

## iOS note
External payments may violate App Store policy → Android-first launch;
payment module isolation allows an IAP variant later.
