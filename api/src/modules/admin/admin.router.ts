import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth, requireStaff } from "../../middleware/auth";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { dashboardRouter } from "./dashboard.router";
import { lessonsAdminRouter } from "./lessons-admin.router";
import { livesAdminRouter } from "./lives-admin.router";
import { paymentsAdminRouter } from "./payments-admin.router";
import { questionsRouter } from "./questions.router";
import { seriesRouter } from "./series.router";
import { allowlistRouter } from "./allowlist-admin.router";
import { courseRequestsAdminRouter } from "./course-requests-admin.router";
import { practicalRouter } from "./practical.router";
import { productsRouter } from "./products.router";
import { settingsAdminRouter } from "./settings-admin.router";
import { uploadRouter } from "./upload.router";
import { usersAdminRouter } from "./users-admin.router";
import { videosRouter } from "./videos.router";

export const adminRouter = Router();

// Security checklist: every /admin/* route is staff-only, and everything below
// the requireAdmin line is ADMIN-only.
adminRouter.use(requireAuth, requireStaff);

// ── Assistant-visible surface ────────────────────────────────────────────────
// The owner's helper handles subscriptions: they read the users list and manage
// the free-access group. Nothing else.
adminRouter.use("/", usersAdminRouter);
adminRouter.use("/", allowlistRouter);

// ── Owner only ───────────────────────────────────────────────────────────────
// Fail-closed on purpose: any route mounted after this line is unreachable for
// an assistant, so a new feature is never accidentally exposed to them.
adminRouter.use(requireAdmin);

adminRouter.use("/series", seriesRouter);
adminRouter.use("/questions", questionsRouter);
adminRouter.use("/upload", uploadRouter);
adminRouter.use("/", settingsAdminRouter);
adminRouter.use("/", practicalRouter);
adminRouter.use("/", productsRouter);
adminRouter.use("/", videosRouter);
adminRouter.use("/", lessonsAdminRouter);
adminRouter.use("/", paymentsAdminRouter);
adminRouter.use("/", livesAdminRouter);
adminRouter.use("/", courseRequestsAdminRouter);
adminRouter.use("/", dashboardRouter);

adminRouter.get("/content-version", async (_req, res) => {
  const cv = await prisma.contentVersion.findUnique({ where: { id: 1 } });
  res.json({ version: cv?.version ?? 0 });
});

// Admin previews: sign any key regardless of entitlement (admin sees all).
const mediaUrlsSchema = z.strictObject({
  keys: z.array(z.string().max(300)).min(1).max(50),
});
adminRouter.post("/media-urls", async (req, res) => {
  const { keys } = mediaUrlsSchema.parse(req.body);
  const urls: Record<string, string> = {};
  await Promise.all(
    keys.map(async (key) => {
      urls[key] = await storage.getSignedUrl(key);
    }),
  );
  res.json({ urls });
});

adminRouter.post("/publish", async (_req, res) => {
  const cv = await prisma.contentVersion.upsert({
    where: { id: 1 },
    update: { version: { increment: 1 } },
    create: { id: 1, version: 1 },
  });
  res.json({ version: cv.version });
});

