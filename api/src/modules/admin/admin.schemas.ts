import { z } from "zod";

export const idParam = z.coerce.number().int().positive();

// Licence category: B = car (default), A = moto, C = truck, D = bus.
export const licenceCategory = z.enum(["B", "A", "C", "D"]);

export const createSeriesSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  isPremium: z.boolean().default(true),
  category: licenceCategory.default("B"),
});

export const updateSeriesSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  isPremium: z.boolean().optional(),
  category: licenceCategory.optional(),
});

export const listSeriesQuery = z.strictObject({
  category: licenceCategory.optional(),
});

export const reorderSeriesSchema = z.strictObject({
  orderedIds: z.array(z.number().int().positive()).min(1).max(500),
});

const answersCount = z.number().int().min(2).max(4);
const correctAnswers = z.array(z.number().int().min(1).max(4)).min(1).max(4);
// Keys are produced by /admin/upload — enforce that shape, never a free path.
const mediaKey = z
  .string()
  .max(300)
  .regex(/^questions\/\d+\/[A-Za-z0-9._-]+$/, "Invalid media key");

// Empty string clears the correction, so the editor can blank the field.
const correctionText = z
  .string()
  .trim()
  .max(1000)
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const createQuestionSchema = z
  .strictObject({
    seriesId: z.number().int().positive(),
    orderNum: z.number().int().positive(),
    answersCount: answersCount.default(4),
    correctAnswers,
    imageKey: mediaKey,
    audioKey: mediaKey,
    correctionText: correctionText.optional(),
    correctionAudioKey: mediaKey.nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.correctAnswers.some((a) => a > v.answersCount)) {
      ctx.addIssue({
        code: "custom",
        path: ["correctAnswers"],
        message: `Correct answers must be between 1 and ${v.answersCount}`,
      });
    }
  });

export const updateQuestionSchema = z.strictObject({
  orderNum: z.number().int().positive().optional(),
  answersCount: answersCount.optional(),
  correctAnswers: correctAnswers.optional(),
  imageKey: mediaKey.optional(),
  audioKey: mediaKey.optional(),
  correctionText: correctionText.optional(),
  correctionAudioKey: mediaKey.nullable().optional(),
});

export const listQuestionsQuery = z.strictObject({
  seriesId: z.coerce.number().int().positive(),
});

// Upload target: question media, lesson-block media, or a category icon.
export const uploadFields = z
  .strictObject({
    seriesId: z.coerce.number().int().positive().optional(),
    orderNum: z.coerce.number().int().positive().optional(),
    lessonId: z.coerce.number().int().positive().optional(),
    slot: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    // Distinguishes uploads that would otherwise share a base key and be told
    // apart only by an opaque _v2 suffix: question audio vs its correction
    // voice-over, and a lesson's sign media vs the lesson's own cover.
    purpose: z.enum(["question", "correction", "cover"]).optional(),
  })
  .superRefine((v, ctx) => {
    const q = v.seriesId !== undefined && v.orderNum !== undefined;
    // A cover belongs to the lesson itself, so it has no sign slot.
    const l =
      v.lessonId !== undefined &&
      (v.purpose === "cover" || v.slot !== undefined);
    const c = v.categoryId !== undefined;
    if ([q, l, c].filter(Boolean).length !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide exactly one target: (seriesId+orderNum) | (lessonId+slot|cover) | categoryId",
      });
    }
  });

export const createCategorySchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  parentId: z.number().int().positive().nullable().optional(),
  isPremium: z.boolean().default(false),
});

export const updateCategorySchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  isPremium: z.boolean().optional(),
  iconKey: z.string().max(300).nullable().optional(),
});

// Lesson media: the lesson's own cover plus its signs' image/audio.
// Declared before the schemas that reference it — a `const` used above its
// definition throws at import time.
const lessonMediaKey = z
  .string()
  .max(300)
  .regex(/^lessons\/\d+\/[A-Za-z0-9._-]+$/, "Invalid lesson media key");

// A lesson is a sign grid or a video list; the kind is fixed at creation
// because the two have completely different children.
export const lessonKind = z.enum(["SIGNS", "VIDEOS"]);

export const createLessonSchema = z.strictObject({
  categoryId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  imageKey: lessonMediaKey.nullable().optional(),
  kind: lessonKind.default("SIGNS"),
});

export const updateLessonSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  imageKey: lessonMediaKey.nullable().optional(),
});

export const createSignSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  imageKey: lessonMediaKey,
  audioKey: lessonMediaKey.nullable().optional(),
});

export const updateSignSchema = z.strictObject({
  name: z.string().trim().min(1).max(200).optional(),
  imageKey: lessonMediaKey.optional(),
  audioKey: lessonMediaKey.nullable().optional(),
});

export const reorderIdsSchema = z.strictObject({
  orderedIds: z.array(z.number().int().positive()).min(1).max(500),
});
