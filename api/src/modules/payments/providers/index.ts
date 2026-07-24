import { env } from "../../../env";
import { MockProvider } from "./mock";
import { PayzoneProvider } from "./payzone";
import type { PaymentProvider } from "./types";

export const paymentProvider: PaymentProvider =
  env.PAYMENT_PROVIDER === "payzone" ? new PayzoneProvider() : new MockProvider();

export type { PaymentProvider } from "./types";
