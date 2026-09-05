import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { authRateLimit } from "../../middleware/rate-limit";
import {
  forgotResetSchema,
  forgotVerifySchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schemas";
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

// Password reset, two steps. Both sit behind the /auth rate limit, and the
// verify step additionally locks the account for 24h after 3 wrong codes.
authRouter.post("/forgot/verify", async (req, res) => {
  const input = forgotVerifySchema.parse(req.body);
  res.json(await authService.verifyResetCode(input));
});

authRouter.post("/forgot/reset", async (req, res) => {
  const input = forgotResetSchema.parse(req.body);
  await authService.resetPassword(input);
  res.status(204).end();
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
