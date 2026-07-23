import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { lessonsAdminRouter } from "./lessons-admin.router";
import { questionsRouter } from "./questions.router";
import { seriesRouter } from "./series.router";
import { uploadRouter } from "./upload.router";

export const adminRouter = Router();

// Security checklist: role=ADMIN enforced server-side on every /admin/* route.
adminRouter.use(requireAuth, requireAdmin);

adminRouter.use("/series", seriesRouter);
adminRouter.use("/questions", questionsRouter);
adminRouter.use("/upload", uploadRouter);
adminRouter.use("/", lessonsAdminRouter);

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
