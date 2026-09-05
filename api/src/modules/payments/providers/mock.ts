import type { Payment } from "@prisma/client";
import type { Request } from "express";
import { appBaseUrl, env } from "../../../env";
import { CASH_CODE_TTL_MS, generateCashCode } from "./codes";
import type {
  CashReference,
  OnlineSession,
  PaymentProvider,
  WebhookResult,
} from "./types";

// Active during the mock phase. The online flow points at a local fake payment
// page served by the API (/mock-pay/:id) with Simulate success/failure buttons;
// the cash flow generates a real-format DRV code. No real money moves.
export class MockProvider implements PaymentProvider {
  readonly kind = "mock" as const;

  async createOnlineSession(payment: Payment): Promise<OnlineSession> {
    return {
      redirectUrl: `${appBaseUrl}/mock-pay/${payment.id}`,
      ref: `MOCK-${payment.id.slice(0, 8)}`,
    };
  }

  async createCashReference(_payment: Payment): Promise<CashReference> {
    return {
      code: generateCashCode(),
      expiresAt: new Date(Date.now() + CASH_CODE_TTL_MS),
    };
  }

  // Dev webhook: a shared-secret header stands in for a real signature. The
  // mock-pay page and the admin "mark as paid" action both post through here.
  verifyWebhook(req: Request): WebhookResult {
    const expected = env.MOCK_WEBHOOK_SECRET;
    // No secret configured = nothing can be verified. Without this, an absent
    // header (undefined) would equal an unset secret (undefined) and every
    // forged callback would be accepted.
    if (!expected) {
      return { valid: false, ref: "", eventId: "", status: "FAILED" };
    }
    const secret = req.header("x-mock-signature");
    const body = req.body as {
      ref?: unknown;
      eventId?: unknown;
      status?: unknown;
    };
    const valid =
      secret === expected &&
      typeof body.ref === "string" &&
      typeof body.eventId === "string" &&
      (body.status === "PAID" || body.status === "FAILED");
    return {
      valid,
      ref: typeof body.ref === "string" ? body.ref : "",
      eventId: typeof body.eventId === "string" ? body.eventId : "",
      status: body.status === "PAID" ? "PAID" : "FAILED",
    };
  }
}
