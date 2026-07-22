import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";

export const attemptsRouter = Router();

attemptsRouter.use(requireAuth);

const questionResultSchema = z.strictObject({
  questionId: z.number().int(),
  order: z.number().int(),
  selected: z.array(z.number().int()),
  correct: z.array(z.number().int()),
  isCorrect: z.boolean(),
  timedOut: z.boolean(),
});

// Client generates the attempt UUID so the same attempt POSTed twice is one row.
const createAttemptSchema = z.strictObject({
  id: z.uuid(),
  seriesId: z.number().int().positive(),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  passed: z.boolean(),
  finishedAt: z.iso.datetime(),
  details: z.array(questionResultSchema).min(1),
});

attemptsRouter.post("/", async (req, res) => {
  const input = createAttemptSchema.parse(req.body);
  if (input.score > input.total) {
    throw new ApiError(400, "score cannot exceed total");
  }

  const series = await prisma.series.findUnique({
    where: { id: input.seriesId },
    select: { id: true },
  });
  if (!series) throw new ApiError(404, "Series not found");

  // Idempotent: re-POSTing the same attempt id is a no-op success.
  const existing = await prisma.attempt.findUnique({ where: { id: input.id } });
  if (existing) {
    res.status(200).json({ id: existing.id, deduped: true });
    return;
  }

  const attempt = await prisma.attempt.create({
    data: {
      id: input.id,
      userId: req.auth!.userId,
      seriesId: input.seriesId,
      score: input.score,
      total: input.total,
      passed: input.passed,
      detailsJson: input.details,
      finishedAt: new Date(input.finishedAt),
    },
  });
  res.status(201).json({ id: attempt.id });
});
