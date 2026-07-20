import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";

export const adminRouter = Router();

// Security checklist: role=ADMIN enforced server-side on every /admin/* route.
adminRouter.use(requireAuth, requireAdmin);

const listUsersQuery = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get("/users", async (req, res) => {
  const q = listUsersQuery.parse(req.query);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.user.count(),
  ]);
  res.json({ users, total, page: q.page, pageSize: q.pageSize });
});
