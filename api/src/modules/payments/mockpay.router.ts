import crypto from "node:crypto";
import express, { Router } from "express";
import { prisma } from "../../prisma";
import { processPaymentEvent } from "./payments.service";

// Dev-only fake gateway page (mock provider). Stands in for Payzone's hosted
// checkout: it renders the amount and Simulate success/failure, which drive the
// same idempotent settlement path a real webhook would.
export const mockPayRouter = Router();

// The Simulate buttons submit an HTML form (urlencoded), not JSON.
mockPayRouter.use(express.urlencoded({ extended: false }));

function page(body: string): string {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>الدفع (محاكاة)</title>
<style>
  body{margin:0;font-family:system-ui,"Segoe UI",Tahoma,sans-serif;background:#0f1115;color:#f2f3f5;
    display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{background:#1a1d24;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px;max-width:360px;width:100%;text-align:center}
  .tag{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8a8f98}
  h1{font-size:20px;margin:8px 0 4px}
  .amount{font-size:34px;font-weight:800;margin:12px 0 20px}
  button{width:100%;border:0;border-radius:10px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-top:10px}
  .ok{background:#2fbf71;color:#08210f}
  .no{background:#22242b;color:#f2f3f5;border:1px solid rgba(255,255,255,.12)}
  .muted{color:#8a8f98;font-size:13px;margin-top:16px}
</style></head><body><div class="card">${body}</div></body></html>`;
}

mockPayRouter.get("/:id", async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) {
    res.status(404).send(page(`<h1>غير موجود</h1>`));
    return;
  }
  if (payment.status !== "PENDING") {
    res.send(page(`<h1>تمت معالجة هذا الدفع</h1><p class="muted">الحالة: ${payment.status} — عد إلى التطبيق.</p>`));
    return;
  }
  res.send(
    page(`
      <div class="tag">بوابة دفع تجريبية</div>
      <h1>تأكيد الدفع</h1>
      <div class="amount">${Number(payment.amount)} ${payment.currency}</div>
      <form method="post" action="/mock-pay/${payment.id}/complete">
        <button class="ok" name="result" value="success">محاكاة نجاح الدفع</button>
        <button class="no" name="result" value="failure">محاكاة فشل الدفع</button>
      </form>
      <p class="muted">هذه صفحة محاكاة — لا تُخصم أي أموال حقيقية.</p>
    `),
  );
});

mockPayRouter.post("/:id/complete", async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) {
    res.status(404).send(page(`<h1>غير موجود</h1>`));
    return;
  }
  const success = req.body?.result === "success";
  // Drive settlement through the same event path the real gateway will use.
  await processPaymentEvent({
    provider: "mock",
    eventId: `mockpay-${payment.id}-${success ? "ok" : "no"}`,
    ref: payment.payzoneRef ?? payment.id,
    status: success ? "PAID" : "FAILED",
    payload: {
      source: "mock-pay-page",
      paymentId: payment.id,
      result: req.body?.result ?? null,
      at: new Date().toISOString(),
      nonce: crypto.randomUUID(),
    },
  });
  res.send(
    page(
      success
        ? `<h1>✅ تم الدفع بنجاح</h1><p class="muted">عد إلى التطبيق — سيتم تفعيل الاشتراك تلقائياً.</p>`
        : `<h1>❌ فشل الدفع</h1><p class="muted">عد إلى التطبيق وحاول مرة أخرى.</p>`,
    ),
  );
});
