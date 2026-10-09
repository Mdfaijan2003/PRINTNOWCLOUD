export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  referenceId: string;
}

export interface CreatePaymentResponse {
  providerOrderId: string;
  status: string;
  raw?: unknown;
}

export interface PaymentProvider {
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean>;

  getKeyId(): string;
}
