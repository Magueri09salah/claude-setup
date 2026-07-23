import { Prisma } from "@prisma/client";
import { Router } from "express";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import {
  createCategorySchema,
  createLessonSchema,
  createSignSchema,
  idParam,
  reorderIdsSchema,
  updateCategorySchema,
  updateLessonSchema,
  updateSignSchema,
} from "./admin.schemas";

// Admin CRUD for lesson categories, lessons, and sign flashcards (M4).
export const lessonsAdminRouter = Router();

// Any sign change must bump the lesson's updatedAt so mobile sync sees it.
async function touchLesson(lessonId: number): Promise<void> {
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { updatedAt: new Date() },
  });
}

function isP2025(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

/* ---------- Categories ---------- */

lessonsAdminRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.lessonCategory.findMany({
    orderBy: { orderNum: "asc" },
    include: { _count: { select: { lessons: true, children: true } } },
  });
  res.json({ categories });
});

lessonsAdminRouter.post("/categories", async (req, res) => {
  const input = createCategorySchema.parse(req.body);
  if (input.parentId) {
    const parent = await prisma.lessonCategory.findUnique({
      where: { id: input.parentId },
    });
    if (!parent) throw new ApiError(404, "Parent category not found");
    if (parent.parentId) throw new ApiError(400, "Max category depth is 2");
  }
  const max = await prisma.lessonCategory.aggregate({ _max: { orderNum: true } });
  const category = await prisma.lessonCategory.create({
    data: {
      title: input.title,
      parentId: input.parentId ?? null,
      isPremium: input.isPremium,
      orderNum: (max._max.orderNum ?? 0) + 1,
    },
  });
  res.status(201).json({ category });
});

lessonsAdminRouter.patch("/categories/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateCategorySchema.parse(req.body);
  try {
    const category = await prisma.lessonCategory.update({
      where: { id },
      data: input,
    });
    res.json({ category });
  } catch (e) {
    if (isP2025(e)) throw new ApiError(404, "Category not found");
    throw e;
  }
});

/* ---------- Lessons ---------- */

lessonsAdminRouter.get("/lessons", async (req, res) => {
  const categoryId = idParam.parse(req.query.categoryId);
  const lessons = await prisma.lesson.findMany({
    where: { categoryId },
    orderBy: { orderNum: "asc" },
    include: { _count: { select: { signs: true } } },
  });
  res.json({ lessons });
});

lessonsAdminRouter.post("/lessons", async (req, res) => {
  const input = createLessonSchema.parse(req.body);
  const category = await prisma.lessonCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) throw new ApiError(404, "Category not found");
  const max = await prisma.lesson.aggregate({
    where: { categoryId: input.categoryId },
    _max: { orderNum: true },
  });
  const lesson = await prisma.lesson.create({
    data: {
      categoryId: input.categoryId,
      title: input.title,
      orderNum: (max._max.orderNum ?? 0) + 1,
    },
  });
  res.status(201).json({ lesson });
});

lessonsAdminRouter.patch("/lessons/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateLessonSchema.parse(req.body);
  try {
    const lesson = await prisma.lesson.update({ where: { id }, data: input });
    res.json({ lesson });
  } catch (e) {
    if (isP2025(e)) throw new ApiError(404, "Lesson not found");
    throw e;
  }
});

/* ---------- Signs (image + name + audio flashcards) ---------- */

lessonsAdminRouter.get("/lessons/:id/signs", async (req, res) => {
  const lessonId = idParam.parse(req.params.id);
  const signs = await prisma.lessonSign.findMany({
    where: { lessonId },
    orderBy: { orderNum: "asc" },
  });
  res.json({ signs });
});

lessonsAdminRouter.post("/lessons/:id/signs", async (req, res) => {
  const lessonId = idParam.parse(req.params.id);
  const input = createSignSchema.parse(req.body);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new ApiError(404, "Lesson not found");
  const max = await prisma.lessonSign.aggregate({
    where: { lessonId },
    _max: { orderNum: true },
  });
  const sign = await prisma.lessonSign.create({
    data: {
      lessonId,
      name: input.name,
      imageKey: input.imageKey,
      audioKey: input.audioKey ?? null,
      orderNum: (max._max.orderNum ?? 0) + 1,
    },
  });
  await touchLesson(lessonId);
  res.status(201).json({ sign });
});

lessonsAdminRouter.patch("/signs/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateSignSchema.parse(req.body);
  const existing = await prisma.lessonSign.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Sign not found");
  const sign = await prisma.lessonSign.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.imageKey !== undefined ? { imageKey: input.imageKey } : {}),
      ...(input.audioKey !== undefined ? { audioKey: input.audioKey } : {}),
    },
  });
  await touchLesson(existing.lessonId);
  res.json({ sign });
});

lessonsAdminRouter.delete("/signs/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.lessonSign.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Sign not found");
  await prisma.lessonSign.delete({ where: { id } });
  await touchLesson(existing.lessonId);
  res.status(204).end();
});

lessonsAdminRouter.post("/lessons/:id/signs/reorder", async (req, res) => {
  const lessonId = idParam.parse(req.params.id);
  const { orderedIds } = reorderIdsSchema.parse(req.body);
  const signs = await prisma.lessonSign.findMany({ where: { lessonId } });
  const known = new Set(signs.map((s) => s.id));
  if (orderedIds.length !== known.size || orderedIds.some((id) => !known.has(id))) {
    throw new ApiError(400, "orderedIds must contain exactly this lesson's signs");
  }
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.lessonSign.update({ where: { id }, data: { orderNum: idx + 1 } }),
    ),
  );
  await touchLesson(lessonId);
  res.json({ ok: true });
});
