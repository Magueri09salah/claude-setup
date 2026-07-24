import type { Payment } from "@prisma/client";
import type { Request } from "express";
import type {
  CashReference,
  OnlineSession,
  PaymentProvider,
  WebhookResult,
} from "./types";

// TODO(payzone): implement from the merchant docs when received. Screens, DB,
// gating and admin pages stay unchanged — only this file gets real logic, then
// set PAYMENT_PROVIDER=payzone. Until then this stub throws if selected.
export class PayzoneProvider implements PaymentProvider {
  readonly kind = "payzone" as const;

  createOnlineSession(_payment: Payment): Promise<OnlineSession> {
    // TODO: call Payzone to create a hosted checkout session; return its URL + ref.
    throw new Error("PayzoneProvider not implemented — awaiting merchant docs");
  }

  createCashReference(_payment: Payment): Promise<CashReference> {
    // TODO: request a real Wafacash reference from Payzone.
    throw new Error("PayzoneProvider not implemented — awaiting merchant docs");
  }

  verifyWebhook(_req: Request): WebhookResult {
    // TODO: verify the gateway signature (HMAC/RSA per docs) BEFORE trusting it.
    throw new Error("PayzoneProvider not implemented — awaiting merchant docs");
  }
}
