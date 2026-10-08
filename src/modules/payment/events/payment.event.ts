export const PAYMENT_EVENTS = {
  SUCCESSFUL: "payment.successful",
  FAILED: "payment.failed",
  REJECTED: "payment.rejected",
  CASH_APPROVAL_REQUIRED: "payment.cash_approval_required",
} as const;

export type PaymentEventName =
  (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];
