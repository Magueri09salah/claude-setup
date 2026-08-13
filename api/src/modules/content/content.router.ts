import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { getAppSettings, toSupportInfo } from "../settings/settings.service";

export const contentRouter = Router();

contentRouter.use(requireAuth);

async function getPremiumStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true },
  });
  if (!user) throw new ApiError(401, "Unknown user");
  // Premium is active only while unexpired (premiumUntil null = lifetime).
  return (
    user.isPremium &&
    (user.premiumUntil === null || user.premiumUntil > new Date())
  );
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

  const [series, categories, lessons] = await Promise.all([
    prisma.series.findMany({
      orderBy: [{ category: "asc" }, { orderNum: "asc" }],
      include: { _count: { select: { questions: true } } },
    }),
    prisma.lessonCategory.findMany({ orderBy: { orderNum: "asc" } }),
    prisma.lesson.findMany({
      orderBy: { orderNum: "asc" },
      include: { _count: { select: { signs: true, videos: true } } },
    }),
  ]);

  const lockedCategoryIds = new Set(
    categories.filter((c) => c.isPremium && !premium).map((c) => c.id),
  );

  res.json({
    version,
    series: series.map((s) => ({
      id: s.id,
      title: s.title,
      orderNum: s.orderNum,
      isPremium: s.isPremium,
      category: s.category,
      locked: s.isPremium && !premium,
      questionCount: s._count.questions,
    })),
    lessonCategories: categories.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      title: c.title,
      iconKey: c.iconKey,
      orderNum: c.orderNum,
      isPremium: c.isPremium,
      locked: lockedCategoryIds.has(c.id),
    })),
    lessons: lessons.map((l) => ({
      id: l.id,
      categoryId: l.categoryId,
      title: l.title,
      imageKey: l.imageKey,
      kind: l.kind,
      orderNum: l.orderNum,
      updatedAt: l.updatedAt,
      signCount: l._count.signs,
      videoCount: l._count.videos,
      locked: lockedCategoryIds.has(l.categoryId),
    })),
  });
});

contentRouter.get("/lessons/:id/signs", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { category: { select: { isPremium: true } } },
  });
  if (!lesson) throw new ApiError(404, "Lesson not found");
  if (lesson.category.isPremium && !(await getPremiumStatus(req.auth!.userId))) {
    throw new ApiError(403, "Premium content locked");
  }
  const signs = await prisma.lessonSign.findMany({
    where: { lessonId: id },
    orderBy: { orderNum: "asc" },
    select: {
      id: true,
      lessonId: true,
      orderNum: true,
      name: true,
      imageKey: true,
      audioKey: true,
    },
  });
  res.json({ signs });
});

// Videos are STREAMED, not synced: they are orders of magnitude bigger than
// every other asset, so the app asks for fresh signed urls when the viewer
// opens the lesson instead of downloading them all up front.
contentRouter.get("/lessons/:id/videos", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { category: { select: { isPremium: true } } },
  });
  if (!lesson) throw new ApiError(404, "Lesson not found");
  if (lesson.category.isPremium && !(await getPremiumStatus(req.auth!.userId))) {
    throw new ApiError(403, "Premium content locked");
  }
  const rows = await prisma.lessonVideo.findMany({
    where: { lessonId: id },
    orderBy: { orderNum: "asc" },
  });
  const videos = await Promise.all(
    rows.map(async (v) => ({
      id: v.id,
      lessonId: v.lessonId,
      orderNum: v.orderNum,
      title: v.title,
      sizeBytes: v.sizeBytes,
      url: await storage.getSignedUrl(v.videoKey),
    })),
  );
  res.json({ videos });
});

// الشق التطبيقي — streamed like lesson videos, so signed urls are minted on
// open rather than cached. Free for everyone: it is the practical part the
// owner wants every candidate to see.
contentRouter.get("/practical-videos", async (_req, res) => {
  const rows = await prisma.practicalVideo.findMany({
    orderBy: { orderNum: "asc" },
  });
  const videos = await Promise.all(
    rows.map(async (v) => ({
      id: v.id,
      orderNum: v.orderNum,
      title: v.title,
      sizeBytes: v.sizeBytes,
      url: await storage.getSignedUrl(v.videoKey),
      thumbUrl: v.thumbKey ? await storage.getSignedUrl(v.thumbKey) : null,
    })),
  );
  res.json({ videos });
});

// Where to ask for access. Online payment was dropped in favour of a WhatsApp
// conversation, after which the admin adds the number to the allowlist.
contentRouter.get("/support", async (_req, res) => {
  res.json(toSupportInfo(await getAppSettings()));
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
      correctionText: true,
      correctionAudioKey: true,
      updatedAt: true,
    },
  });
  res.json({ questions });
});

// Sync engine requests signed URLs in batches of 20.
const mediaUrlsSchema = z.strictObject({
  keys: z
    .array(
      z
        .string()
        .max(300)
        .regex(/^(questions|lessons)\/[A-Za-z0-9/_.-]+$/),
    )
    .min(1)
    .max(20),
});

contentRouter.post("/media-urls", async (req, res) => {
  const { keys } = mediaUrlsSchema.parse(req.body);
  const premium = await getPremiumStatus(req.auth!.userId);

  const [questions, signs, lessonCovers] = await Promise.all([
    prisma.question.findMany({
      where: {
        OR: [
          { imageKey: { in: keys } },
          { audioKey: { in: keys } },
          { correctionAudioKey: { in: keys } },
        ],
      },
      select: {
        imageKey: true,
        audioKey: true,
        correctionAudioKey: true,
        series: { select: { isPremium: true } },
      },
    }),
    prisma.lessonSign.findMany({
      where: { OR: [{ imageKey: { in: keys } }, { audioKey: { in: keys } }] },
      select: {
        imageKey: true,
        audioKey: true,
        lesson: { select: { category: { select: { isPremium: true } } } },
      },
    }),
    prisma.lesson.findMany({
      where: { imageKey: { in: keys } },
      select: {
        imageKey: true,
        category: { select: { isPremium: true } },
      },
    }),
  ]);

  const keyPremium = new Map<string, boolean>();
  for (const q of questions) {
    keyPremium.set(q.imageKey, q.series.isPremium);
    keyPremium.set(q.audioKey, q.series.isPremium);
    if (q.correctionAudioKey) {
      keyPremium.set(q.correctionAudioKey, q.series.isPremium);
    }
  }
  for (const s of signs) {
    keyPremium.set(s.imageKey, s.lesson.category.isPremium);
    if (s.audioKey) keyPremium.set(s.audioKey, s.lesson.category.isPremium);
  }
  // Lesson covers are teasers: a locked lesson still shows its picture on the
  // card, the same way locked category icons do.
  for (const l of lessonCovers) {
    if (l.imageKey) keyPremium.set(l.imageKey, false);
  }

  for (const key of keys) {
    // Category icons are teaser-visible to everyone (locked cards show them).
    if (key.startsWith("lessons/icons/")) continue;
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
