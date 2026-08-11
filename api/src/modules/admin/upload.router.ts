import { Router } from "express";
import multer from "multer";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import { uploadFields } from "./admin.schemas";

// Security checklist: whitelist mime types, cap sizes, re-derive the extension
// server-side, never trust the client filename.
const ALLOWED: Record<
  string,
  { ext: string; kind: "image" | "audio"; maxBytes: number }
> = {
  "image/webp": { ext: "webp", kind: "image", maxBytes: 5 * 1024 * 1024 },
  "image/png": { ext: "png", kind: "image", maxBytes: 5 * 1024 * 1024 },
  "image/jpeg": { ext: "jpg", kind: "image", maxBytes: 5 * 1024 * 1024 },
  "audio/mpeg": { ext: "mp3", kind: "audio", maxBytes: 10 * 1024 * 1024 },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), async (req, res) => {
  const fields = uploadFields.parse(req.body);
  const file = req.file;
  if (!file) throw new ApiError(400, "Missing file field 'file'");

  const spec = ALLOWED[file.mimetype];
  if (!spec) {
    throw new ApiError(415, "Unsupported file type — webp/png/jpg/mp3 only");
  }
  if (file.size > spec.maxBytes) {
    throw new ApiError(
      413,
      `File too large — max ${Math.round(spec.maxBytes / 1024 / 1024)}MB for ${spec.kind}`,
    );
  }

  // Resolve the target and its immutable base key.
  let base: string;
  if (fields.seriesId !== undefined) {
    const series = await prisma.series.findUnique({
      where: { id: fields.seriesId },
    });
    if (!series) throw new ApiError(404, "Series not found");
    base =
      fields.purpose === "correction"
        ? `questions/${fields.seriesId}/${fields.orderNum}_correction`
        : `questions/${fields.seriesId}/${fields.orderNum}`;
  } else if (fields.lessonId !== undefined) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: fields.lessonId },
    });
    if (!lesson) throw new ApiError(404, "Lesson not found");
    base =
      fields.purpose === "cover"
        ? `lessons/${fields.lessonId}/cover`
        : `lessons/${fields.lessonId}/${fields.slot}`;
  } else {
    const category = await prisma.lessonCategory.findUnique({
      where: { id: fields.categoryId! },
    });
    if (!category) throw new ApiError(404, "Category not found");
    // Icons stay visible to free users (locked teasers), so they get their own prefix.
    base = `lessons/icons/${fields.categoryId}`;
  }

  // Media convention: keys are immutable. Replacements get _v2, _v3, …
  let key = `${base}.${spec.ext}`;
  for (let v = 2; await storage.exists(key); v++) {
    key = `${base}_v${v}.${spec.ext}`;
  }

  await storage.put(key, file.buffer, file.mimetype);
  res
    .status(201)
    .json({ key, kind: spec.kind, url: await storage.getSignedUrl(key) });
});
