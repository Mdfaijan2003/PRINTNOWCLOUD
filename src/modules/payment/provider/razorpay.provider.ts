import Razorpay from "razorpay";
import crypto from "node:crypto";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentProvider,
} from "./payment-provider.interface.js";

export class RazorpayProvider implements PaymentProvider {
  private razorpay: Razorpay;
  private readonly keyId: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID!;

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  getKeyId(): string {
    return this.keyId;
  }

  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    const order = await this.razorpay.orders.create({
      amount: request.amount * 100,
      currency: request.currency,
      receipt: request.referenceId,
    });

    return {
      providerOrderId: order.id,
      status: order.status,
      raw: order,
    };
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error("Razorpay secret is not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest();

    let receivedSignature: Buffer;

    try {
      receivedSignature = Buffer.from(signature, "hex");
    } catch {
      return false;
    }

    if (
      receivedSignature.length !== expectedSignature.length ||
      receivedSignature.toString("hex") !== signature.toLowerCase()
    ) {
      return false;
    }

    return crypto.timingSafeEqual(expectedSignature, receivedSignature);
  }
}
