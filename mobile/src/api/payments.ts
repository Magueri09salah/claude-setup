import { api } from "./client";

export interface Pricing {
  amount: number;
  currency: string;
  durationDays: number;
  label: string;
}

export type PayStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export interface PaymentStatus {
  id: string;
  status: PayStatus;
  method: "ONLINE" | "WAFACASH";
  code: string | null;
  expiresAt: string | null;
  amount: number;
  currency: string;
}

export function getPricing() {
  return api<Pricing>("/payments/pricing");
}

export function createOnlinePayment() {
  return api<{ id: string; redirectUrl: string }>("/payments/online/create", {
    method: "POST",
  });
}

export function createWafacashPayment() {
  return api<{
    id: string;
    code: string;
    expiresAt: string;
    amount: number;
    currency: string;
  }>("/payments/wafacash/create", { method: "POST" });
}

export function getPaymentStatus(id: string) {
  return api<PaymentStatus>(`/payments/${id}/status`);
}
