import { OutboxRepository } from "../../infrastructure/outbox/outbox.repository.js";
import { PrintJobGrpcClient } from "../../infrastructure/grpc/grpc.client.js";

import { PaymentRepository } from "./payment.repository.js";
import { PaymentService } from "./payment.service.js";
import { PaymentController } from "./payment.controller.js";
import { RazorpayProvider } from "./provider/razorpay.provider.js";

const paymentRepository = new PaymentRepository();
const outboxRepository = new OutboxRepository();
const razorpayProvider = new RazorpayProvider();

const printJobGrpcClient = new PrintJobGrpcClient("localhost:50051");

export const paymentService = new PaymentService(
  paymentRepository,
  outboxRepository,
  printJobGrpcClient,
  razorpayProvider,
);

export const paymentController = new PaymentController(paymentService);
