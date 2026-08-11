import { Router } from "express";
import { prisma } from "../../prisma";
import { getLiveSettings, toPublicLive } from "../lives/lives.service";

// Admin dashboard KPIs. Mounted under the ADMIN role guard.
export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", async (_req, res) => {
  const now = new Date();
  const [
    users,
    premiumUsers,
    paidAgg,
    paidCount,
    attempts,
    liveSettings,
    recentAttempts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        isPremium: true,
        OR: [{ premiumUntil: null }, { premiumUntil: { gt: now } }],
      },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: "PAID" } }),
    prisma.attempt.count(),
    getLiveSettings(),
    prisma.attempt.findMany({
      orderBy: { finishedAt: "desc" },
      take: 8,
      select: {
        id: true,
        seriesId: true,
        score: true,
        total: true,
        passed: true,
        finishedAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  res.json({
    users,
    premiumUsers,
    revenue: Number(paidAgg._sum.amount ?? 0),
    paidCount,
    attempts,
    pushReach: liveSettings.lastPushReach,
    liveStartTime: liveSettings.startTime,
    liveEnabled: toPublicLive(liveSettings).enabled,
    nextLiveAt: toPublicLive(liveSettings).nextStartAt,
    recentAttempts: recentAttempts.map((a) => ({
      id: a.id,
      seriesId: a.seriesId,
      score: a.score,
      total: a.total,
      passed: a.passed,
      finishedAt: a.finishedAt,
      userEmail: a.user.email,
    })),
  });
});
