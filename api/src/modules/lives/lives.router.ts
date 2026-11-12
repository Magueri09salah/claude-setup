import { Router } from "express";
import { optionalAuth } from "../../middleware/auth";
import { guestRateLimit } from "../../middleware/rate-limit";
import { getLiveSettings, toPublicLive } from "./lives.service";

export const livesRouter = Router();

// The live is for everyone, guests included (owner decision 2026-11-12), so a
// token is optional here. A token that is sent is still verified.
livesRouter.use(optionalAuth, guestRateLimit);

// The live is a fixed daily appointment on fixed profiles, so the app only
// needs the platform links plus when the next one starts. Times go out as UTC
// ISO. App 1.0.1+ ignores those and recomputes them on the phone's own clock.
livesRouter.get("/settings", async (_req, res) => {
  const settings = await getLiveSettings();
  res.json(toPublicLive(settings));
});
