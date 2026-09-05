import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { markPaidByAdmin } from "../payments/payments.service";

// Admin users + payments management (sync-payments skill). Every money/premium
// change is audited. Mounted under the ADMIN role guard.
export const paymentsAdminRouter = Router();

const paymentsQuery = z.strictObject({
  status: z.enum(["all", "PENDING", "PAID", "FAILED", "EXPIRED"]).default("all"),
  method: z.enum(["all", "ONLINE", "WAFACASH"]).default("all"),
});

paymentsAdminRouter.get("/payments", async (req, res) => {
  const q = paymentsQuery.parse(req.query);
  const payments = await prisma.payment.findMany({
    where: {
      ...(q.status === "all" ? {} : { status: q.status }),
      ...(q.method === "all" ? {} : { method: q.method }),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      user: {
        select: { username: true, email: true, phone: true, fullName: true },
      },
    },
  });
  res.json({
    payments: payments.map((p) => ({
      id: p.id,
      userEmail: p.user.username ?? p.user.email,
      userName: p.user.fullName,
      userPhone: p.user.phone,
      method: p.method,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      wafacashCode: p.wafacashCode,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      expiresAt: p.expiresAt,
    })),
  });
});

// Manual confirmation — simulates the webhook during the mock phase (audited).
paymentsAdminRouter.post("/payments/:id/mark-paid", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const payment = await markPaidByAdmin(id, req.auth!.userId);
  res.json({ id: payment.id, status: payment.status });
});
