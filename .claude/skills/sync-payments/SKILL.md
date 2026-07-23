---
name: sync-payments
description: Payment flows (mock provider now, Payzone/Wafacash later), premium gating, admin payment management, and webhook rules. Use before any work on payment screens, payment endpoints, webhook handling, admin users/payments pages, or premium content access control.
---

# Payments & Premium Gating

## Iron rule (applies in mock phase too)
Premium is granted ONLY by the server. The client can request, poll, and display —
never decide. No client-side flag grants access to premium media (server refuses
signed URLs for non-entitled keys).

## CURRENT PHASE: MOCK PROVIDER (gateway credentials not yet available)

Build the complete structure now; the real gateway plugs in later without
changing screens, DB, or gating logic.

### PaymentProvider interface (api/src/modules/payments/providers/)
```ts
interface PaymentProvider {
  createOnlineSession(payment): Promise<{ redirectUrl: string; ref: string }>
  createCashReference(payment): Promise<{ code: string; expiresAt: Date }>
  verifyWebhook(req): { valid: boolean; ref: string; status: PayStatus }
}
```
- `MockProvider` (active now): createOnlineSession returns a local fake payment
  page URL (`/mock-pay/:paymentId` served by the api) with "Simulate success" /
  "Simulate failure" buttons; createCashReference generates the real code format
  `DRV-XXXXXX` (crypto-random, no O/0/I/1, unique, 72h expiry, single-use).
- `PayzoneProvider` (stub file, TODO comments only): to be implemented from the
  merchant docs when received. Selected via env `PAYMENT_PROVIDER=mock|payzone`.

### Mobile payment screens (final UI — not throwaway)
- `payment/index`: premium pitch + price + two big option cards:
  💳 "الدفع بالبطاقة البنكية" → online flow
  🏪 "الدفع نقداً في وكالة Wafacash" → cash-code flow
- `payment/online`: creates payment → opens provider URL in expo-web-browser →
  on return polls `GET /payments/:id/status` (2s, max 60s) → PAID = unlock + sync,
  else "لم يتم تأكيد الدفع بعد" state with retry.
- `payment/wafacash`: shows the code HUGE + amount + expiry countdown + Arabic
  step-by-step instructions + "تحقق من الدفع" poll button. Status states:
  PENDING (waiting) / PAID (success + sync) / EXPIRED (regenerate button).
- Locked premium items everywhere show 🔒 + CTA routing to `payment/index`.

### Admin (this is how payments are confirmed during mock phase)
- **Users page**: table of ALL registered users — email/phone, registration date,
  payment status badge (🟢 مدفوع PAID / 🟡 في انتظار الدفع PENDING / ⚪ مجاني none),
  method (ONLINE/WAFACASH/—), device count, last seen. Search + filter by status.
- **Payments page**: all Payment rows — user, method, amount, status, wafacashCode,
  createdAt, paidAt. Filter by status; dedicated "pending Wafacash codes" view.
- **Manual confirm (critical for mock phase + permanent support tool):**
  "تأكيد الدفع يدوياً / Mark as paid" button on a PENDING payment → server-side
  admin-only endpoint `POST /admin/payments/:id/mark-paid` → sets PAID, paidAt,
  user.isPremium=true, logs adminId + timestamp in an audit field. Confirmation
  modal required. This simulates the webhook today and stays useful later for
  cash-payment edge cases.
- Also allow admin to toggle a user's premium directly (with audit log).

### Webhook (structure now, verification later)
`POST /webhooks/payzone` exists and routes through `provider.verifyWebhook()`.
MockProvider accepts a shared-secret header in dev. Handler is idempotent (same
event twice = one effect), logs every payload, and is the ONLY automatic path
that flips premium. Real signature verification lands with PayzoneProvider.

### Pricing / config
Amount, currency (MAD), and access duration in env + a `PRICING` config file —
placeholder value now (e.g. 99 MAD lifetime), client confirms later. Do not
hardcode prices in screens.

## WHEN CREDENTIALS ARRIVE (later task, do not build now)
Implement PayzoneProvider (real session creation, real Wafacash reference, real
signature verification), switch `PAYMENT_PROVIDER=payzone`, test in sandbox, then
production. Screens, DB, gating, and admin pages stay unchanged.

## iOS note
External payments may violate App Store policy → Android-first launch; the
provider abstraction also allows an Apple IAP variant later.
