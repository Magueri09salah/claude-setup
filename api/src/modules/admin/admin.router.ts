import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { dashboardRouter } from "./dashboard.router";
import { lessonsAdminRouter } from "./lessons-admin.router";
import { livesAdminRouter } from "./lives-admin.router";
import { paymentsAdminRouter } from "./payments-admin.router";
import { questionsRouter } from "./questions.router";
import { seriesRouter } from "./series.router";
import { allowlistRouter } from "./allowlist-admin.router";
import { practicalRouter } from "./practical.router";
import { settingsAdminRouter } from "./settings-admin.router";
import { uploadRouter } from "./upload.router";
import { videosRouter } from "./videos.router";

export const adminRouter = Router();

// Security checklist: role=ADMIN enforced server-side on every /admin/* route.
adminRouter.use(requireAuth, requireAdmin);

adminRouter.use("/series", seriesRouter);
adminRouter.use("/questions", questionsRouter);
adminRouter.use("/upload", uploadRouter);
adminRouter.use("/", settingsAdminRouter);
adminRouter.use("/", practicalRouter);
adminRouter.use("/", allowlistRouter);
adminRouter.use("/", videosRouter);
adminRouter.use("/", lessonsAdminRouter);
adminRouter.use("/", paymentsAdminRouter);
adminRouter.use("/", livesAdminRouter);
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

