import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";
import { storage } from "../../storage";

export const contentRouter = Router();

contentRouter.use(requireAuth);

async function getPremiumStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true },
  });
  if (!user) throw new ApiError(401, "Unknown user");
  return user.isPremium;
}

// Manifest: everything the client needs to decide what to sync. Premium items
// appear as locked teasers for free users — titles only, no content access.
contentRouter.get("/manifest", async (req, res) => {
  const premium = await getPremiumStatus(req.auth!.userId);
  const cv = await prisma.contentVersion.findUnique({ where: { id: 1 } });
  const version = cv?.version ?? 0;

  const etag = `W/"v${version}-p${premium ? 1 : 0}"`;
  res.set("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }

  const series = await prisma.series.findMany({
    orderBy: { orderNum: "asc" },
    include: { _count: { select: { questions: true } } },
  });

  res.json({
    version,
    series: series.map((s) => ({
      id: s.id,
      title: s.title,
      orderNum: s.orderNum,
      isPremium: s.isPremium,
      locked: s.isPremium && !premium,
      questionCount: s._count.questions,
    })),
    // Lessons land in M4 — empty for now so the client shape is stable.
    lessonCategories: [],
    lessons: [],
  });
});

const questionsQuery = z.strictObject({
  since: z.iso.datetime().optional(),
});

contentRouter.get("/series/:id/questions", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const { since } = questionsQuery.parse(req.query);

  const series = await prisma.series.findUnique({ where: { id } });
  if (!series) throw new ApiError(404, "Series not found");
  if (series.isPremium && !(await getPremiumStatus(req.auth!.userId))) {
    throw new ApiError(403, "Premium content locked");
  }

  const questions = await prisma.question.findMany({
    where: {
      seriesId: id,
      ...(since ? { updatedAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { orderNum: "asc" },
    select: {
      id: true,
      seriesId: true,
      orderNum: true,
      answersCount: true,
      correctAnswers: true,
      imageKey: true,
      audioKey: true,
      updatedAt: true,
    },
  });
  res.json({ questions });
});

// Sync engine requests signed URLs in batches of 20.
const mediaUrlsSchema = z.strictObject({
  keys: z
    .array(z.string().max(300).regex(/^questions\/\d+\/[A-Za-z0-9._-]+$/))
    .min(1)
    .max(20),
});

contentRouter.post("/media-urls", async (req, res) => {
  const { keys } = mediaUrlsSchema.parse(req.body);
  const premium = await getPremiumStatus(req.auth!.userId);

  const questions = await prisma.question.findMany({
    where: {
      OR: [{ imageKey: { in: keys } }, { audioKey: { in: keys } }],
    },
    select: {
      imageKey: true,
      audioKey: true,
      series: { select: { isPremium: true } },
    },
  });

  const keyPremium = new Map<string, boolean>();
  for (const q of questions) {
    keyPremium.set(q.imageKey, q.series.isPremium);
    keyPremium.set(q.audioKey, q.series.isPremium);
  }

  for (const key of keys) {
    const isPremiumKey = keyPremium.get(key);
    if (isPremiumKey === undefined) throw new ApiError(404, `Unknown key: ${key}`);
    // Security checklist: signed URLs only for keys the user is entitled to.
    if (isPremiumKey && !premium) {
      throw new ApiError(403, "Premium content locked");
    }
  }

  const urls: Record<string, string> = {};
  await Promise.all(
    keys.map(async (key) => {
      urls[key] = await storage.getSignedUrl(key);
    }),
  );
  res.json({ urls });
});
