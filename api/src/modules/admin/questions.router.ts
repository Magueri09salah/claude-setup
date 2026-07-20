import { Prisma } from "@prisma/client";
import { Router } from "express";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import { storage } from "../../storage";
import {
  createQuestionSchema,
  idParam,
  listQuestionsQuery,
  updateQuestionSchema,
} from "./admin.schemas";

export const questionsRouter = Router();

questionsRouter.get("/", async (req, res) => {
  const { seriesId } = listQuestionsQuery.parse(req.query);
  const questions = await prisma.question.findMany({
    where: { seriesId },
    orderBy: { orderNum: "asc" },
  });
  res.json({ questions });
});

questionsRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) throw new ApiError(404, "Question not found");
  const [imageUrl, audioUrl] = await Promise.all([
    storage.getSignedUrl(question.imageKey),
    storage.getSignedUrl(question.audioKey),
  ]);
  res.json({ question, imageUrl, audioUrl });
});

questionsRouter.post("/", async (req, res) => {
  const input = createQuestionSchema.parse(req.body);
  const series = await prisma.series.findUnique({
    where: { id: input.seriesId },
  });
  if (!series) throw new ApiError(404, "Series not found");
  try {
    const question = await prisma.question.create({ data: input });
    res.status(201).json({ question });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "This order number is already used in the series");
    }
    throw e;
  }
});

questionsRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateQuestionSchema.parse(req.body);
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Question not found");

  const effectiveCount = input.answersCount ?? existing.answersCount;
  const effectiveAnswers =
    input.correctAnswers ?? (existing.correctAnswers as number[]);
  if (effectiveAnswers.some((a) => a > effectiveCount)) {
    throw new ApiError(
      400,
      `Correct answers must be between 1 and ${effectiveCount}`,
    );
  }

  try {
    const question = await prisma.question.update({ where: { id }, data: input });
    res.json({ question });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ApiError(409, "This order number is already used in the series");
    }
    throw e;
  }
});
