import os from "node:os";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { idParam, reorderIdsSchema } from "./admin.schemas";

// الشق التطبيقي — a flat list of practical-driving videos. Mounted under the
// ADMIN role guard.
export const practicalRouter = Router();

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

const ALLOWED_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};
const ALLOWED_IMAGE: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// diskStorage, never memory: a video must not be held in RAM.
const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 2 },
});

const titleSchema = z.string().trim().min(1).max(200);

practicalRouter.get("/practical-videos", async (_req, res) => {
  const videos = await prisma.practicalVideo.findMany({
    orderBy: { orderNum: "asc" },
  });
  res.json({ videos });
});

// Video + optional poster in one request, so a failure can't strand a file.
practicalRouter.post(
  "/practical-videos",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumb", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file = files?.file?.[0];
    const thumb = files?.thumb?.[0];
    if (!file) throw new ApiError(400, "Missing file field 'file'");

    const ext = ALLOWED_VIDEO[file.mimetype];
    if (!ext) throw new ApiError(415, "Unsupported video type — mp4/mov only");
    const thumbExt = thumb ? ALLOWED_IMAGE[thumb.mimetype] : undefined;
    if (thumb && !thumbExt) {
      throw new ApiError(415, "Unsupported poster type — webp/png/jpg only");
    }

    const title = titleSchema.parse(req.body?.title);
    const max = await prisma.practicalVideo.aggregate({
      _max: { orderNum: true },
    });
    const orderNum = (max._max.orderNum ?? 0) + 1;

    // Keys are immutable, as everywhere else in this codebase.
    let videoKey = `practical/${orderNum}.${ext}`;
    for (let v = 2; await storage.exists(videoKey); v++) {
      videoKey = `practical/${orderNum}_v${v}.${ext}`;
    }
    await storage.putFile(videoKey, file.path, file.mimetype);

    let thumbKey: string | null = null;
    if (thumb && thumbExt) {
      thumbKey = `practical/${orderNum}_poster.${thumbExt}`;
      for (let v = 2; await storage.exists(thumbKey); v++) {
        thumbKey = `practical/${orderNum}_poster_v${v}.${thumbExt}`;
      }
      await storage.putFile(thumbKey, thumb.path, thumb.mimetype);
    }

    const video = await prisma.practicalVideo.create({
      data: { orderNum, title, videoKey, thumbKey, sizeBytes: file.size },
    });
    res.status(201).json({ video });
  },
);

practicalRouter.patch("/practical-videos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const title = titleSchema.parse(req.body?.title);
  const existing = await prisma.practicalVideo.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Video not found");
  const video = await prisma.practicalVideo.update({
    where: { id },
    data: { title },
  });
  res.json({ video });
});

practicalRouter.post("/practical-videos/reorder", async (req, res) => {
  const { orderedIds } = reorderIdsSchema.parse(req.body);
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ApiError(400, "Duplicate video ids in order");
  }
  const known = new Set(
    (await prisma.practicalVideo.findMany({ select: { id: true } })).map(
      (v) => v.id,
    ),
  );
  if (orderedIds.some((id) => !known.has(id))) {
    throw new ApiError(400, "Unknown video id in order");
  }
  await prisma.$transaction(
    orderedIds.map((id, idx) =>
      prisma.practicalVideo.update({
        where: { id },
        data: { orderNum: idx + 1 },
      }),
    ),
  );
  res.status(204).end();
});

practicalRouter.delete("/practical-videos/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const existing = await prisma.practicalVideo.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Video not found");
  await prisma.practicalVideo.delete({ where: { id } });
  res.status(204).end();
});
