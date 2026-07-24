import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "../../prisma";
import { processPaymentEvent } from "./payments.service";
import { paymentProvider } from "./providers";

// The gateway calls this. Signature/secret is verified by the provider BEFORE
// any state change (security checklist); handling is idempotent and logs every
// payload. This is the only automatic path that flips premium.
export const webhookRouter = Router();

webhookRouter.post("/payzone", async (req, res) => {
  const result = paymentProvider.verifyWebhook(req);
  if (!result.valid) {
    // Log the rejected attempt for forensics; never act on it.
    await prisma.webhookEvent
      .create({
        data: {
          provider: paymentProvider.kind,
          eventId: `rejected-${crypto.randomUUID()}`,
          payload: { rejected: true, body: req.body as never },
          processed: false,
        },
      })
      .catch(() => undefined);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }
  await processPaymentEvent({
    provider: paymentProvider.kind,
    eventId: result.eventId,
    ref: result.ref,
    status: result.status,
    payload: req.body as never,
  });
  res.json({ received: true });
});
