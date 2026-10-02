import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { prisma } from "../../prisma";

/**
 * Candidate-facing side of «الانضمام إلى المجموعة».
 *
 * The iOS unlock screen has no WhatsApp button — App Store guideline 3.1.1
 * forbids sending the candidate out of the app to arrange access — so the
 * request travels over the API instead of over a chat, and the owner answers
 * it in the panel (طلبات التسجيل في المجموعة).
 *
 * Nothing here grants anything. This router only records that someone asked;
 * premium is still granted server-side by an admin, exactly as the security
 * rules require.
 */
export const groupRequestsRouter = Router();

groupRequestsRouter.use(requireAuth);

// The upsert below already caps the damage at one row per candidate, so this
// is only here to stop a loop burning writes on the database.
groupRequestsRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.auth?.userId ?? req.ip ?? "anon",
    message: { error: "Too many requests, slow down" },
  }),
);

// Nothing to send: who is asking comes from the token, never from the body.
// strictObject so a client that invents a field (say `isPremium`) is refused
// rather than silently ignored.
const createSchema = z.strictObject({});

groupRequestsRouter.post("/", async (req, res) => {
  createSchema.parse(req.body ?? {});
  const userId = req.auth!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });

  // Upsert, not create: asking again refreshes the request (and revives a
  // rejected or already-approved one, which is how a renewal arrives after the
  // three months run out) instead of duplicating it.
  const request = await prisma.groupRequest.upsert({
    where: { userId },
    update: {
      status: "PENDING",
      phone: user?.phone ?? null,
      // A fresh ask is not yet handled — clear the previous verdict so the row
      // does not look like it was already dealt with today.
      handledById: null,
      handledAt: null,
    },
    create: { userId, phone: user?.phone ?? null },
  });

  res.status(201).json({
    request: {
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
    },
  });
});

/** The app shows «طلبك قيد المراجعة» instead of the button once one exists. */
groupRequestsRouter.get("/mine", async (req, res) => {
  const request = await prisma.groupRequest.findUnique({
    where: { userId: req.auth!.userId },
    select: { id: true, status: true, createdAt: true },
  });
  res.json({ request });
});
