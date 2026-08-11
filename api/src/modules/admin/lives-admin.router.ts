import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import {
  getLiveSettings,
  pushForLive,
  toPublicLive,
} from "../lives/lives.service";

// The live is a standing daily appointment, so there is nothing to CRUD — the
// owner only maintains the four profile links and the hour. Mounted under the
// ADMIN role guard.
export const livesAdminRouter = Router();

// Empty string clears a link; anything else must be a real url.
const profileUrl = z
  .union([z.literal(""), z.url().max(500)])
  .transform((v) => (v === "" ? null : v))
  .nullable();

const settingsSchema = z.strictObject({
  youtubeUrl: profileUrl.optional(),
  facebookUrl: profileUrl.optional(),
  instagramUrl: profileUrl.optional(),
  tiktokUrl: profileUrl.optional(),
  // Wall-clock time in Africa/Casablanca.
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "الوقت يجب أن يكون بصيغة HH:mm")
    .optional(),
  enabled: z.boolean().optional(),
});

livesAdminRouter.get("/live-settings", async (_req, res) => {
  const settings = await getLiveSettings();
  res.json({ settings, preview: toPublicLive(settings) });
});

livesAdminRouter.put("/live-settings", async (req, res) => {
  const input = settingsSchema.parse(req.body);
  await getLiveSettings(); // guarantees the singleton exists
  const settings = await prisma.liveSettings.update({
    where: { id: 1 },
    data: {
      ...input,
      // Changing the hour re-arms today's pushes: the new time may still be
      // ahead of us even though the old one already fired.
      ...(input.startTime !== undefined
        ? { lastReminderOn: null, lastStartOn: null }
        : {}),
    },
  });
  res.json({ settings, preview: toPublicLive(settings) });
});

// Manual "we're live now" broadcast, for when the owner starts off-schedule.
livesAdminRouter.post("/live-settings/notify-now", async (_req, res) => {
  const reach = await pushForLive("started");
  res.json({ reach });
});
