import type { Payment, Prisma } from "@prisma/client";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { premiumExpiryFromNow, PRICING } from "./pricing";
import { paymentProvider } from "./providers";

export async function createOnlinePayment(userId: string) {
  const payment = await prisma.payment.create({
    data: {
      userId,
      method: "ONLINE",
      amount: PRICING.amount,
      currency: PRICING.currency,
      status: "PENDING",
    },
  });
  const session = await paymentProvider.createOnlineSession(payment);
  await prisma.payment.update({
    where: { id: payment.id },
    data: { payzoneRef: session.ref },
  });
  return { id: payment.id, redirectUrl: session.redirectUrl };
}

export async function createWafacashPayment(userId: string) {
  // Reuse the user's active (pending, unexpired) code so its 72h window keeps
  // counting down across app restarts. A new code is issued ONLY after the old
  // one is paid or expires — the code is generated once, not on every visit.
  const existing = await prisma.payment.findFirst({
    where: {
      userId,
      method: "WAFACASH",
      status: "PENDING",
      wafacashCode: { not: null },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing?.wafacashCode && existing.expiresAt) {
    return {
      id: existing.id,
      code: existing.wafacashCode,
      expiresAt: existing.expiresAt,
      amount: Number(existing.amount),
      currency: existing.currency,
    };
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      method: "WAFACASH",
      amount: PRICING.amount,
      currency: PRICING.currency,
      status: "PENDING",
    },
  });
  const ref = await paymentProvider.createCashReference(payment);
  await prisma.payment.update({
    where: { id: payment.id },
    data: { wafacashCode: ref.code, expiresAt: ref.expiresAt },
  });
  return {
    id: payment.id,
    code: ref.code,
    expiresAt: ref.expiresAt,
    amount: PRICING.amount,
    currency: PRICING.currency,
  };
}

export async function getPaymentStatus(id: string, userId: string) {
  let payment = await prisma.payment.findFirst({ where: { id, userId } });
  if (!payment) throw new ApiError(404, "Payment not found");
  // Expire a stale pending cash code on read (security: 72h single-use window).
  if (
    payment.status === "PENDING" &&
    payment.expiresAt &&
    payment.expiresAt < new Date()
  ) {
    payment = await prisma.payment.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
  }
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    code: payment.wafacashCode,
    expiresAt: payment.expiresAt,
    amount: Number(payment.amount),
    currency: payment.currency,
  };
}

// The single place premium is granted, from a settled payment. Idempotent:
// returns true only if THIS call flipped PENDING → PAID.
export async function settlePaid(paymentId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const p = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!p || p.status === "PAID") return false;
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: new Date() },
    });
    await tx.user.update({
      where: { id: p.userId },
      data: { isPremium: true, premiumUntil: premiumExpiryFromNow() },
    });
    return true;
  });
}

async function settleFailed(paymentId: string): Promise<void> {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

// The ONLY automatic path that flips premium. Idempotent by (provider,eventId)
// AND by payment status — same event twice = one effect. Logs every payload.
export async function processPaymentEvent(input: {
  provider: string;
  eventId: string;
  ref: string;
  status: "PAID" | "FAILED";
  payload: Prisma.InputJsonValue;
}): Promise<void> {
  const key = { provider: input.provider, eventId: input.eventId };
  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: key },
  });
  if (existing?.processed) return; // already applied
  await prisma.webhookEvent.upsert({
    where: { provider_eventId: key },
    update: { payload: input.payload },
    create: { ...key, payload: input.payload, processed: false },
  });

  const payment = await prisma.payment.findFirst({
    where: { OR: [{ payzoneRef: input.ref }, { wafacashCode: input.ref }] },
  });
  if (payment) {
    if (input.status === "PAID") await settlePaid(payment.id);
    else await settleFailed(payment.id);
  }

  await prisma.webhookEvent.update({
    where: { provider_eventId: key },
    data: { processed: true },
  });
}

// Admin manual confirmation (audited) — simulates the webhook during mock phase
// and stays useful for cash-payment edge cases later.
export async function markPaidByAdmin(
  paymentId: string,
  adminId: string,
): Promise<Payment> {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) throw new ApiError(404, "Payment not found");
  const flipped = await settlePaid(paymentId);
  await prisma.auditLog.create({
    data: {
      adminId,
      action: "mark_paid",
      targetType: "payment",
      targetId: paymentId,
      detail: flipped ? "flipped PENDING→PAID" : "already PAID (no-op)",
    },
  });
  return (await prisma.payment.findUnique({ where: { id: paymentId } }))!;
}

export async function setUserPremium(
  userId: string,
  isPremium: boolean,
  adminId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isPremium, premiumUntil: isPremium ? premiumExpiryFromNow() : null },
  });
  await prisma.auditLog.create({
    data: {
      adminId,
      action: isPremium ? "grant_premium" : "revoke_premium",
      targetType: "user",
      targetId: userId,
    },
  });
}
