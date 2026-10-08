import { Router } from "express";

import { PaymentController } from "./payment.controller.js";

export function createPaymentRouter(
  paymentController: PaymentController,
): Router {
  const router = Router();

  // Customer payment creation
  router.post("/", paymentController.createPayment);

  // Cash approval queue for shop owner
  router.get("/cash/approval-queue", paymentController.getCashApprovalQueue);

  // Get payment details
  router.get("/:id", paymentController.getPaymentById);

  // Shop owner approves cash payment
  router.post("/:id/approve", paymentController.approveCashPayment);

  // Shop owner rejects cash payment
  router.post("/:id/reject", paymentController.rejectCashPayment);

  return router;
}
