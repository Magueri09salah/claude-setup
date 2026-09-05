import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";

// Candidate-facing side of "التسجيل في الدروس": they pick the city where they
// want to take driving lessons and press the WhatsApp button. The request is
// recorded here so the owner still has the lead in the admin panel even if the
// chat never actually arrives (app not installed, message never sent…).
export const courseRequestsRouter = Router();

courseRequestsRouter.use(requireAuth);

// The city comes from a fixed picker in the app, so this only has to bound the
// value — an odd string pollutes nothing but the sender's own row.
const createSchema = z.strictObject({
  city: z.string().trim().min(2).max(60),
});

courseRequestsRouter.post("/", async (req, res) => {
  const { city } = createSchema.parse(req.body);
  const userId = req.auth!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  // Upsert, not create: pressing the button twice for the same city refreshes
  // the lead (and revives a cancelled one) instead of duplicating it.
  const request = await prisma.courseRequest.upsert({
    where: { userId_city: { userId, city } },
    update: { status: "PENDING", phone: user?.phone ?? null },
    create: { userId, city, phone: user?.phone ?? null },
  });

  res.status(201).json({
    request: {
      id: request.id,
      city: request.city,
      status: request.status,
      createdAt: request.createdAt,
    },
  });
});

/** The app shows "طلبك قيد المعالجة" next to a city already asked for. */
courseRequestsRouter.get("/mine", async (req, res) => {
  const requests = await prisma.courseRequest.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, city: true, status: true, createdAt: true },
  });
  res.json({ requests });
});
