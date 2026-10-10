import crypto from "node:crypto";
import mongoose from "mongoose";

import { OutboxRepository } from "../../infrastructure/outbox/outbox.repository.js";
import { PrintJobGrpcClient } from "../../infrastructure/grpc/grpc.client.js";
import { PaymentRepository } from "./payment.repository.js";
import { PAYMENT_EVENTS } from "./events/payment.event.js";
import { PAYMENT_STATUS, type PaymentStatus } from "./payment.status.js";
import { PAYMENT_METHOD, type PaymentMethod } from "./payment.types.js";
import type { PaymentProvider } from "./provider/payment-provider.interface.js";
import { canTransition } from "./payment.transition.js";
import type { CreatePaymentInput } from "./payment.schema.js";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly outboxRepository: OutboxRepository,
    private readonly printJobGrpcClient: PrintJobGrpcClient,
    private readonly paymentProvider: PaymentProvider,
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
     */
    const activePayment =
      await this.paymentRepository.findActiveByPrintJobId(printJobId);

    if (activePayment) {
      throw new Error("An active payment already exists for this PrintJob");
    }

    /*
     * Fetch authoritative payment details
     * from PrintJob service through gRPC.
     */
    const printJob =
      await this.printJobGrpcClient.getPaymentDetails(printJobId);

    /*
     * Payment can only be created when
     * the PrintJob is waiting for payment.
     */
    if (printJob.status !== "PAYMENT_REQUIRED") {
      throw new Error(
        `PrintJob is not available for payment. Current status: ${printJob.status}`,
      );
    }

    /*
     * Amount and currency are owned by PrintJob.
     * Payment does not calculate or trust frontend values.
     */
    if (!Number.isInteger(printJob.amount) || printJob.amount <= 0) {
      throw new Error("Invalid payment amount received from PrintJob");
    }

    if (!printJob.currency) {
      throw new Error("Invalid payment currency received from PrintJob");
    }

    /*Check for payment method*/
    let providerOrderId: string | null = null;

    if (method === PAYMENT_METHOD.ONLINE) {
      const providerPayment = await this.paymentProvider.createPayment({
        amount: printJob.amount,
        currency: printJob.currency,
        referenceId: idempotencyKey,
      });

      providerOrderId = providerPayment.providerOrderId;
    }

    /*
     * Create payment attempt.
     */
    const paymentData = {
      printJobId,
      amount: printJob.amount,
      currency: printJob.currency as "INR",
      method,
      provider: method === PAYMENT_METHOD.ONLINE ? ("RAZORPAY" as const) : null,
      providerOrderId,
      providerPaymentId: null,
      idempotencyKey,
      status:
        method === PAYMENT_METHOD.CASH
          ? PAYMENT_STATUS.AWAITING_APPROVAL
          : PAYMENT_STATUS.PENDING,
      customer,
    };

    try {
      const payment = await this.paymentRepository.create(paymentData);

      if (method === PAYMENT_METHOD.ONLINE) {
        return {
          payment,
          checkout: {
            keyId: this.paymentProvider.getKeyId(),
            orderId: payment.providerOrderId,
            amount: payment.amount * 100,
            currency: payment.currency,
            customer,
          },
        };
      }

      return { payment };
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        /*
         * Idempotency key collision should not normally happen
         * because the key is generated internally.
         */
        if (this.isIdempotencyKeyDuplicate(error)) {
          throw new Error("Payment request already exists");
        }
      }

      throw error;
    }
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
    providerPaymentId?: string,
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
        if (providerPaymentId) {
          updatedPayment = await this.paymentRepository.markSuccessful(
            paymentId,
            currentStatus,
            providerPaymentId,
            session,
          );
        } else {
          updatedPayment = await this.paymentRepository.transitionStatus(
            paymentId,
            currentStatus,
            nextStatus,
            session,
          );
        }

        if (!updatedPayment) {
          throw new Error("Payment status changed by another request");
        }

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

  private async failOnlinePayment(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (
      payment.method !== PAYMENT_METHOD.ONLINE ||
      payment.status !== PAYMENT_STATUS.PENDING
    ) {
      // Duplicate or stale webhook: do not overwrite another status.
      return;
    }

    const currentStatus = PAYMENT_STATUS.PENDING;
    const nextStatus = PAYMENT_STATUS.FAILED;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const updatedPayment = await this.paymentRepository.transitionStatus(
          paymentId,
          currentStatus,
          nextStatus,
          session,
        );

        // Another request may have updated the payment first.
        if (!updatedPayment) return;

        await this.outboxRepository.create(
          {
            eventName: PAYMENT_EVENTS.FAILED,
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
    } finally {
      await session.endSession();
    }
  }

  async handleRazorpayWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<void> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error("Razorpay webhook secret is not configured");
    }

    if (!Buffer.isBuffer(rawBody) || !/^[a-fA-F0-9]{64}$/.test(signature)) {
      throw new Error("Invalid Razorpay webhook signature");
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest();

    const received = Buffer.from(signature, "hex");

    if (!crypto.timingSafeEqual(expected, received)) {
      throw new Error("Invalid Razorpay webhook signature");
    }

    let event: {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            currency?: string;
            status?: string;
          };
        };
      };
    };

    try {
      event = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new Error("Invalid JSON in Razorpay webhook payload");
    }

    // A failed payment event describes one attempt. The customer may retry
    // against the same Razorpay order, so it must not fail the whole PrintNow
    // payment record. We only finalize it after a verified captured event.
    if (event.event === "payment.failed") return;
    if (event.event !== "payment.captured") return;

    const providerPayment = event.payload?.payment?.entity;
    const orderId = providerPayment?.order_id;
    const providerPaymentId = providerPayment?.id;

    if (
      !orderId ||
      !providerPaymentId ||
      !Number.isInteger(providerPayment?.amount) ||
      !providerPayment?.currency ||
      providerPayment.status !== "captured"
    ) {
      throw new Error("Invalid captured payment data in Razorpay webhook");
    }

    const payment = await this.paymentRepository.findByProviderOrderId(orderId);
    if (!payment) throw new Error("Payment not found for Razorpay order");

    if (
      payment.method !== PAYMENT_METHOD.ONLINE ||
      payment.provider !== "RAZORPAY"
    ) {
      throw new Error("Razorpay order does not belong to an online payment");
    }

    if (
      providerPayment.amount !== payment.amount * 100 ||
      providerPayment.currency !== payment.currency
    ) {
      throw new Error("Razorpay payment amount or currency mismatch");
    }

    // Sequential duplicate delivery is idempotent.
    if (payment.status === PAYMENT_STATUS.SUCCESSFUL) return;

    await this.completePayment(
      payment._id.toString(),
      payment.status as PaymentStatus,
      providerPaymentId,
    );
  }
}
