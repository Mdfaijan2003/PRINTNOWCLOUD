export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  referenceId: string;
}

export interface CreatePaymentResponse {
  providerPaymentId: string;
  status: string;
  raw?: unknown;
}

export interface PaymentProvider {
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;

  verifyPayment(providerPaymentId: string): Promise<boolean>;
}
