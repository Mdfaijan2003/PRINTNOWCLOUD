import { type PaymentStatus, PAYMENT_STATUS } from "./payment.status.js";

const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  [PAYMENT_STATUS.PENDING]: [
    PAYMENT_STATUS.SUCCESSFUL,
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELLED,
  ],

  [PAYMENT_STATUS.AWAITING_APPROVAL]: [
    PAYMENT_STATUS.SUCCESSFUL,
    PAYMENT_STATUS.REJECTED,
    PAYMENT_STATUS.CANCELLED,
  ],

  [PAYMENT_STATUS.SUCCESSFUL]: [],

  [PAYMENT_STATUS.FAILED]: [],

  [PAYMENT_STATUS.REJECTED]: [],

  [PAYMENT_STATUS.CANCELLED]: [],
};

export function canTransition(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}
