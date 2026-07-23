import { z } from "zod";

export const idParam = z.coerce.number().int().positive();

export const createSeriesSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  isPremium: z.boolean().default(true),
});

export const updateSeriesSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  isPremium: z.boolean().optional(),
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

export const createQuestionSchema = z
  .strictObject({
    seriesId: z.number().int().positive(),
    orderNum: z.number().int().positive(),
    answersCount: answersCount.default(4),
    correctAnswers,
    imageKey: mediaKey,
    audioKey: mediaKey,
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
  })
  .superRefine((v, ctx) => {
    const q = v.seriesId !== undefined && v.orderNum !== undefined;
    const l = v.lessonId !== undefined && v.slot !== undefined;
    const c = v.categoryId !== undefined;
    if ([q, l, c].filter(Boolean).length !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide exactly one target: (seriesId+orderNum) | (lessonId+slot) | categoryId",
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

export const createLessonSchema = z.strictObject({
  categoryId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
});

export const updateLessonSchema = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
});

// A lesson is a grid of sign flashcards: image + Arabic name + audio.
const lessonMediaKey = z
  .string()
  .max(300)
  .regex(/^lessons\/\d+\/[A-Za-z0-9._-]+$/, "Invalid lesson media key");

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
