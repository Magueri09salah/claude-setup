import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { markPaidByAdmin, setUserPremium } from "../payments/payments.service";

// Admin users + payments management (sync-payments skill). Every money/premium
// change is audited. Mounted under the ADMIN role guard.
export const paymentsAdminRouter = Router();

const usersQuery = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["all", "paid", "pending", "free"]).default("all"),
});

// Users page: every registered user with an effective payment status + method.
paymentsAdminRouter.get("/users", async (req, res) => {
  const q = usersQuery.parse(req.query);
  const where = q.search
    ? {
        OR: [
          { username: { contains: q.search, mode: "insensitive" as const } },
          { fullName: { contains: q.search, mode: "insensitive" as const } },
          { email: { contains: q.search, mode: "insensitive" as const } },
          { phone: { contains: q.search } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      payments: { orderBy: { createdAt: "desc" } },
      _count: { select: { devices: true } },
    },
  });

  const now = new Date();
  const rows = users.map((u) => {
    const premiumActive =
      u.isPremium && (u.premiumUntil === null || u.premiumUntil > now);
    const lastPaid = u.payments.find((p) => p.status === "PAID");
    const pending = u.payments.find((p) => p.status === "PENDING");
    // Effective status shown on the badge.
    const status: "paid" | "pending" | "free" = premiumActive
      ? "paid"
      : pending
        ? "pending"
        : "free";
    const method = (lastPaid ?? pending)?.method ?? null;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      isPremium: premiumActive,
      premiumUntil: u.premiumUntil,
      createdAt: u.createdAt,
      deviceCount: u._count.devices,
      status,
      method,
      lastPaidAt: lastPaid?.paidAt ?? null,
    };
  });

  const filtered =
    q.status === "all" ? rows : rows.filter((r) => r.status === q.status);
  const total = filtered.length;
  const start = (q.page - 1) * q.pageSize;
  res.json({
    users: filtered.slice(start, start + q.pageSize),
    total,
    page: q.page,
    pageSize: q.pageSize,
  });
});

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

const premiumBody = z.strictObject({ isPremium: z.boolean() });

// Direct premium toggle (audited) — support tool for edge cases.
paymentsAdminRouter.post("/users/:id/premium", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { isPremium } = premiumBody.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");
  await setUserPremium(id, isPremium, req.auth!.userId);
  res.json({ id, isPremium });
});
