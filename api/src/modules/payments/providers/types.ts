import type { Payment } from "@prisma/client";
import type { Request } from "express";

export interface OnlineSession {
  redirectUrl: string;
  ref: string;
}

export interface CashReference {
  code: string;
  expiresAt: Date;
}

export interface WebhookResult {
  valid: boolean;
  ref: string;
  eventId: string;
  // A settlement event is always terminal — paid or failed.
  status: "PAID" | "FAILED";
}

// The seam the real Payzone gateway plugs into later without touching screens,
// DB, or gating logic (sync-payments skill).
export interface PaymentProvider {
  readonly kind: "mock" | "payzone";
  createOnlineSession(payment: Payment): Promise<OnlineSession>;
  createCashReference(payment: Payment): Promise<CashReference>;
  verifyWebhook(req: Request): WebhookResult;
}
