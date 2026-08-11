import os from "node:os";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { idParam, reorderIdsSchema } from "./admin.schemas";

// Videos for VIDEOS-kind lessons (المركبة). Mounted under the ADMIN guard.
export const videosRouter = Router();

// 500MB: a 10-minute 1080p lesson clip lands around 150–300MB.
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const ALLOWED_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};

// diskStorage, NOT memoryStorage: a video must never be held in RAM — one
// concurrent upload would be enough to take the process down.
const uploadVideo = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
});

const titleSchema = z.string().trim().min(1).max(200);

async function requireVideoLesson(lessonId: number) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new ApiError(404, "Lesson not found");
  if (lesson.kind !== "VIDEOS") {
    throw new ApiError(400, "This lesson is a sign grid, not a video lesson");
  }
  return lesson;
}

videosRouter.get("/lessons/:id/videos", async (req, res) => {
  const lessonId = idParam.parse(req.params.id);
  const videos = await prisma.lessonVideo.findMany({
    where: { lessonId },
    orderBy: { orderNum: "asc" },
  });
  res.json({ videos });
});

// One request does the whole thing: file + title in, row out. Splitting upload
// from create would leave orphaned files whenever the second call failed.
videosRouter.post(
  "/lessons/:id/videos",
  uploadVideo.single("file"),
  async (req, res) => {
    const lessonId = idParam.parse(req.params.id);
    const file = req.file;
    if (!file) throw new ApiError(400, "Missing file field 'file'");

    const ext = ALLOWED_VIDEO[file.mimetype];
    if (!ext) {
      throw new ApiError(415, "Unsupported video type — mp4/mov only");
    }
    await requireVideoLesson(lessonId);
    const title = titleSchema.parse(req.body?.title);

    const max = await prisma.lessonVideo.aggregate({
      where: { lessonId },
      _max: { orderNum: true },
    });
    const orderNum = (max._max.orderNum ?? 0) + 1;

    // Keys are immutable, like every other media key here.
    let key = `lessons/${lessonId}/video_${orderNum}.${ext}`;
    for (let v = 2; await storage.exists(key); v++) {
      key = `lessons/${lessonId}/video_${orderNum}_v${v}.${ext}`;
    }
    await storage.putFile(key, file.path, file.mimetype);

    const video = await prisma.lessonVideo.create({
      data: { lessonId, orderNum, title, videoKey: key, sizeBytes: file.size },
    });
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { updatedAt: new Date() },
    });
    res.status(201).json({ video });
  },
);

videosRouter.patch("/videos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const title = titleSchema.parse(req.body?.title);
  const existing = await prisma.lessonVideo.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Video not found");
  const video = await prisma.lessonVideo.update({
    where: { id },
    data: { title },
  });
  res.json({ video });
});

videosRouter.post("/lessons/:id/videos/reorder", async (req, res) => {
  const lessonId = idParam.parse(req.params.id);
  const { orderedIds } = reorderIdsSchema.parse(req.body);
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ApiError(400, "Duplicate video ids in order");
  }
  const owned = await prisma.lessonVideo.findMany({
    where: { lessonId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((v) => v.id));
  if (orderedIds.some((id) => !ownedIds.has(id))) {
    throw new ApiError(400, "Video does not belong to this lesson");
  }
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.lessonVideo.update({ where: { id }, data: { orderNum: idx + 1 } }),
    ),
  );
  res.status(204).end();
});

videosRouter.delete("/videos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.lessonVideo.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Video not found");
  await prisma.lessonVideo.delete({ where: { id } });
  await prisma.lesson.update({
    where: { id: existing.lessonId },
    data: { updatedAt: new Date() },
  });
  // The stored object is intentionally left in place: keys are immutable and
  // orphan cleanup is a separate, auditable job.
  res.status(204).end();
});
