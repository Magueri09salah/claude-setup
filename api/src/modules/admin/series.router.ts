import { Prisma } from "@prisma/client";
import { Router } from "express";
import { ApiError } from "../../middleware/errors";
import { prisma } from "../../prisma";
import {
  createSeriesSchema,
  idParam,
  reorderSeriesSchema,
  updateSeriesSchema,
} from "./admin.schemas";

export const seriesRouter = Router();

seriesRouter.get("/", async (_req, res) => {
  const series = await prisma.series.findMany({
    orderBy: { orderNum: "asc" },
    include: { _count: { select: { questions: true } } },
  });
  res.json({ series });
});

seriesRouter.post("/", async (req, res) => {
  const input = createSeriesSchema.parse(req.body);
  const max = await prisma.series.aggregate({ _max: { orderNum: true } });
  const series = await prisma.series.create({
    data: { ...input, orderNum: (max._max.orderNum ?? 0) + 1 },
  });
  res.status(201).json({ series });
});

seriesRouter.post("/reorder", async (req, res) => {
  const { orderedIds } = reorderSeriesSchema.parse(req.body);
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ApiError(400, "Duplicate series ids in order");
  }
  try {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.series.update({ where: { id }, data: { orderNum: idx + 1 } }),
      ),
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ApiError(404, "Unknown series id in order");
    }
    throw e;
  }
  res.json({ ok: true });
});

seriesRouter.patch("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const input = updateSeriesSchema.parse(req.body);
  try {
    const series = await prisma.series.update({ where: { id }, data: input });
    res.json({ series });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ApiError(404, "Series not found");
    }
    throw e;
  }
});
