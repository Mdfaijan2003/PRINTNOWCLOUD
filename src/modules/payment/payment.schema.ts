import { z } from "zod";
import { PAYMENT_METHOD } from "./payment.types.js";

export const createPaymentSchema = z.object({
  printJobId: z.string().min(1),

  method: z.enum([PAYMENT_METHOD.CASH, PAYMENT_METHOD.ONLINE]),

  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    email: z.email(),
  }),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
