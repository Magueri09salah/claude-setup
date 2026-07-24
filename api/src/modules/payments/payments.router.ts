import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../../middleware/auth";
import {
  createOnlinePayment,
  createWafacashPayment,
  getPaymentStatus,
} from "./payments.service";
import { PRICING, pricingLabel } from "./pricing";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

// Security checklist: /payments/* limited to 20 requests/min/user.
paymentsRouter.use(
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.auth?.userId ?? req.ip ?? "anon",
    message: { error: "Too many requests, slow down" },
  }),
);

paymentsRouter.get("/pricing", (_req, res) => {
  res.json({
    amount: PRICING.amount,
    currency: PRICING.currency,
    durationDays: PRICING.durationDays,
    label: pricingLabel(),
  });
});

paymentsRouter.post("/online/create", async (req, res) => {
  const result = await createOnlinePayment(req.auth!.userId);
  res.status(201).json(result);
});

paymentsRouter.post("/wafacash/create", async (req, res) => {
  const result = await createWafacashPayment(req.auth!.userId);
  res.status(201).json(result);
});

paymentsRouter.get("/:id/status", async (req, res) => {
  const result = await getPaymentStatus(req.params.id, req.auth!.userId);
  res.json(result);
});
