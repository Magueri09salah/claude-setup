import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { authRateLimit } from "../../middleware/rate-limit";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas";
import * as authService from "./auth.service";

export const authRouter = Router();

authRouter.use(authRateLimit);

// Current user (fresh premium) — the app calls this after a payment settles.
authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await authService.getMe(req.auth!.userId) });
});

authRouter.post("/register", async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
});

authRouter.post("/login", async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json(result);
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json(result);
});

authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).end();
});
