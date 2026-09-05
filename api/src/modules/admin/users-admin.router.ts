import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { setUserPremium } from "../payments/payments.service";
import { extendPremium, PREMIUM_MONTHS } from "../premium/duration";

// The المستخدمون page: every registered account with its access status, plus
// the manual premium toggle. Split out of payments-admin because an ASSISTANT
// may use these two routes and none of the payment ones.
export const usersAdminRouter = Router();

const usersQuery = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
  search: z.string().trim().max(200).optional(),
  status: z.enum(["all", "paid", "expired", "pending", "free"]).default("all"),
});

// Users page: every registered user with an effective payment status + method.
usersAdminRouter.get("/users", async (req, res) => {
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
    // Expired = had access, term ran out. Kept distinct from "free" because
    // these are exactly the people the owner renews after a WhatsApp message.
    const expired =
      !premiumActive && u.isPremium && u.premiumUntil !== null && u.premiumUntil <= now;
    const status: "paid" | "expired" | "pending" | "free" = premiumActive
      ? "paid"
      : expired
        ? "expired"
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

const premiumBody = z.strictObject({ isPremium: z.boolean() });

// Direct premium toggle (audited) — support tool for edge cases.
usersAdminRouter.post("/users/:id/premium", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { isPremium } = premiumBody.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");
  await setUserPremium(id, isPremium, req.auth!.userId);
  res.json({ id, isPremium });
});

const renewBody = z.strictObject({}).optional();

/**
 * "تجديد" — give this account another PREMIUM_MONTHS. This is the after-expiry
 * path the owner uses: find the candidate by phone or name, press renew.
 * Audited like every other grant.
 */
usersAdminRouter.post("/users/:id/renew", async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  renewBody.parse(req.body ?? undefined);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");

  const premiumUntil = extendPremium(user.premiumUntil);
  await prisma.user.update({
    where: { id },
    data: { isPremium: true, premiumUntil },
  });
  await prisma.auditLog.create({
    data: {
      adminId: req.auth!.userId,
      action: "renew_premium",
      targetType: "user",
      targetId: id,
      detail: `+${PREMIUM_MONTHS} months, until ${premiumUntil.toISOString().slice(0, 10)}`,
    },
  });
  res.json({ id, isPremium: true, premiumUntil });
});
