import Razorpay from "razorpay";
import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentProvider,
} from "./payment-provider.interface.js";

export class RazorpayProvider implements PaymentProvider {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }

  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    const order = await this.razorpay.orders.create({
      amount: request.amount,
      currency: request.currency,
      receipt: request.referenceId,
    });

    return {
      providerPaymentId: order.id,
      status: order.status,
      raw: order,
    };
  }

  async verifyPayment(providerPaymentId: string): Promise<boolean> {
    // Verification logic will be implemented
    // with the actual UPI payment flow.
    return true;
  }
}
