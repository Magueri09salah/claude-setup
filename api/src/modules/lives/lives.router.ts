import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { getLiveSettings, toPublicLive } from "./lives.service";

export const livesRouter = Router();

livesRouter.use(requireAuth);

// The live is a fixed daily appointment on fixed profiles, so the app only
// needs the platform links plus when the next one starts. Times go out as UTC
// ISO. App 1.0.1+ ignores those and recomputes them on the phone's own clock.
livesRouter.get("/settings", async (_req, res) => {
  const settings = await getLiveSettings();
  res.json(toPublicLive(settings));
});
