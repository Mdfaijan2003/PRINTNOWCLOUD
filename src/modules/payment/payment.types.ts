import { type PaymentStatus } from "./payment.status.js";

export const PAYMENT_METHOD = {
  CASH: "CASH",
  ONLINE: "ONLINE",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_PROVIDER = {
  RAZORPAY: "RAZORPAY",
} as const;

export type PaymentProvider =
  (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export interface PaymentDocument {
  printJobId: string;

  amount: number;
  currency: "INR";

  method: PaymentMethod;
  status: PaymentStatus;

  provider: PaymentProvider | null;
  providerPaymentId: string | null;

  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}
