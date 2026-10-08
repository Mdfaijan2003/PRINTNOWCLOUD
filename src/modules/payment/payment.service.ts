import mongoose from "mongoose";

import { OutboxRepository } from "../../infrastructure/outbox/outbox.repository.js";
import { PrintJobService } from "../printJob/printJob.service.js";
import { PaymentRepository } from "./payment.repository.js";
import { PAYMENT_EVENTS } from "./events/payment.event.js";
import { PAYMENT_STATUS, type PaymentStatus } from "./payment.status.js";
import { PAYMENT_METHOD, type PaymentMethod } from "./payment.types.js";
import { canTransition } from "./payment.transition.js";
import type { CreatePaymentInput } from "./payment.schema.js";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async createPayment(input: CreatePaymentInput) {
    const { printJobId, method, customer } = input;

    /*
     * Payment module owns idempotency.
     */
    const idempotencyKey = crypto.randomUUID();

    /*
     * Prevent multiple active payment attempts
     * for the same PrintJob.
     *
     * FAILED / REJECTED payments are not active,
     * so retrying the same PrintJob is allowed.
     */
    const activePayment =
      await this.paymentRepository.findActiveByPrintJobId(printJobId);

    if (activePayment) {
      throw new Error("An active payment already exists for this PrintJob");
    }

    /*
     * TODO:
     * Fetch authoritative payment details from PrintJob
     * through gRPC.
     *
     * This will give us:
     * - amount
     * - currency
     * - payable status
     */

    /*
     * TODO:
     * Online:
     *   create UPI payment/order
     *
     * Cash:
     *   create approval flow
     */

    // Temporary structure until gRPC + provider flow is implemented.
    const paymentData = {
      printJobId,
      amount: 0,
      currency: "INR" as const,
      method,
      provider: method === PAYMENT_METHOD.ONLINE ? ("RAZORPAY" as const) : null,
      providerPaymentId: null,
      idempotencyKey,
      status:
        method === PAYMENT_METHOD.CASH
          ? PAYMENT_STATUS.AWAITING_APPROVAL
          : PAYMENT_STATUS.PENDING,
      customer,
    };

    return this.paymentRepository.create(paymentData);
  }

  async getPaymentById(paymentId: string) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    return payment;
  }

  async getCashApprovalQueue() {
    return this.paymentRepository.findCashApprovalQueue();
  }

  async approveCashPayment(paymentId: string) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.method !== PAYMENT_METHOD.CASH) {
      throw new Error("Only cash payments can be approved manually");
    }

    return this.completePayment(paymentId, payment.status as PaymentStatus);
  }

  async rejectCashPayment(paymentId: string) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.method !== PAYMENT_METHOD.CASH) {
      throw new Error("Only cash payments can be rejected manually");
    }

    const currentStatus = payment.status as PaymentStatus;

    const nextStatus = PAYMENT_STATUS.REJECTED;

    if (!canTransition(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid payment transition: ${currentStatus} → ${nextStatus}`,
      );
    }

    const session = await mongoose.startSession();

    try {
      let updatedPayment;

      await session.withTransaction(async () => {
        updatedPayment = await this.paymentRepository.transitionStatus(
          paymentId,
          currentStatus,
          nextStatus,
          session,
        );

        if (!updatedPayment) {
          throw new Error("Payment status changed by another request");
        }

        await this.outboxRepository.create(
          {
            eventName: PAYMENT_EVENTS.REJECTED,
            aggregateType: "Payment",
            aggregateId: updatedPayment._id.toString(),
            payload: {
              paymentId: updatedPayment._id.toString(),
              printJobId: updatedPayment.printJobId.toString(),
            },
          },
          session,
        );
      });

      return updatedPayment;
    } finally {
      await session.endSession();
    }
  }

  private async completePayment(
    paymentId: string,
    currentStatus: PaymentStatus,
  ) {
    const nextStatus = PAYMENT_STATUS.SUCCESSFUL;

    if (!canTransition(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid payment transition: ${currentStatus} → ${nextStatus}`,
      );
    }

    const session = await mongoose.startSession();

    try {
      let updatedPayment;

      await session.withTransaction(async () => {
        updatedPayment = await this.paymentRepository.transitionStatus(
          paymentId,
          currentStatus,
          nextStatus,
          session,
        );

        /*
         * Atomic concurrency protection.
         */
        if (!updatedPayment) {
          throw new Error("Payment status changed by another request");
        }

        /*
         * Payment state and domain event
         * are committed together.
         */
        await this.outboxRepository.create(
          {
            eventName: PAYMENT_EVENTS.SUCCESSFUL,
            aggregateType: "Payment",
            aggregateId: updatedPayment._id.toString(),
            payload: {
              paymentId: updatedPayment._id.toString(),
              printJobId: updatedPayment.printJobId.toString(),
            },
          },
          session,
        );
      });

      return updatedPayment;
    } finally {
      await session.endSession();
    }
  }

  private calculateSelectedPages(
    pageCount: number,
    pageSelection: {
      type: "ALL" | "PAGES" | "RANGES";
      pages?: number[];
      ranges?: {
        start: number;
        end: number;
      }[];
    },
  ): number {
    if (!Number.isInteger(pageCount) || pageCount <= 0) {
      throw new Error("PrintJob contains an invalid page count");
    }

    switch (pageSelection.type) {
      case "ALL":
        return pageCount;

      case "PAGES": {
        const pages = pageSelection.pages ?? [];

        if (!pages.length) {
          throw new Error("Page selection must contain at least one page");
        }

        for (const page of pages) {
          if (!Number.isInteger(page) || page < 1 || page > pageCount) {
            throw new Error(`Invalid page selection: ${page}`);
          }
        }

        return pages.length;
      }

      case "RANGES": {
        const ranges = pageSelection.ranges ?? [];

        if (!ranges.length) {
          throw new Error("Page selection must contain at least one range");
        }

        let selectedPages = 0;

        for (const range of ranges) {
          if (
            !Number.isInteger(range.start) ||
            !Number.isInteger(range.end) ||
            range.start < 1 ||
            range.end < range.start ||
            range.end > pageCount
          ) {
            throw new Error(`Invalid page range: ${range.start}-${range.end}`);
          }

          selectedPages += range.end - range.start + 1;
        }

        return selectedPages;
      }

      default:
        throw new Error("Invalid page selection type");
    }
  }

  private isDuplicateKeyError(error: unknown): error is {
    code: number;
    keyPattern?: Record<string, unknown>;
  } {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
    );
  }

  private isIdempotencyKeyDuplicate(error: {
    keyPattern?: Record<string, unknown>;
  }): boolean {
    return error.keyPattern?.idempotencyKey === 1;
  }
}
