import mongoose from "mongoose";

import { PaymentModel } from "./payment.model.js";
import type { PaymentStatus } from "./payment.status.js";

export class PaymentRepository {
  async create(data: Parameters<typeof PaymentModel.create>[0]) {
    return PaymentModel.create(data);
  }

  async findById(id: string) {
    return PaymentModel.findById(id);
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return PaymentModel.findOne({
      idempotencyKey,
    });
  }

  async findActiveByPrintJobId(printJobId: string) {
    return PaymentModel.findOne({
      printJobId,

      status: {
        $in: ["PENDING", "AWAITING_APPROVAL"],
      },
    });
  }

  async findCashApprovalQueue() {
    return PaymentModel.find({
      method: "CASH",
      status: "AWAITING_APPROVAL",
    }).sort({
      createdAt: 1,
    });
  }

  async transitionStatus(
    paymentId: string,
    currentStatus: PaymentStatus,
    nextStatus: PaymentStatus,
    session: mongoose.ClientSession,
  ) {
    return PaymentModel.findOneAndUpdate(
      {
        _id: paymentId,
        status: currentStatus,
      },

      {
        $set: {
          status: nextStatus,
        },
      },

      {
        new: true,
        session,
      },
    );
  }

  async markSuccessful(
    paymentId: string,
    currentStatus: PaymentStatus,
    providerPaymentId: string,
    session: mongoose.ClientSession,
  ) {
    return PaymentModel.findOneAndUpdate(
      {
        _id: paymentId,
        status: currentStatus,
        method: "ONLINE",
        provider: "RAZORPAY",
      },
      {
        $set: {
          status: "SUCCESSFUL",
          providerPaymentId,
        },
      },
      {
        new: true,
        session,
      },
    );
  }

  async findByProviderOrderId(orderId: string) {
    return PaymentModel.findOne({
      providerOrderId: orderId,
      provider: "RAZORPAY",
    });
  }
}
