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

export const uploadFields = z.strictObject({
  seriesId: z.coerce.number().int().positive(),
  orderNum: z.coerce.number().int().positive(),
});
