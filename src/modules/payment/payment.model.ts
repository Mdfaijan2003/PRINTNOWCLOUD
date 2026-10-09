import { Schema, model } from "mongoose";
import { PAYMENT_METHOD, PAYMENT_PROVIDER } from "./payment.types.js";
import { PAYMENT_STATUS } from "./payment.status.js";

const paymentSchema = new Schema(
  {
    printJobId: {
      type: Schema.Types.ObjectId,
      ref: "PrintJob",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Amount must be an integer",
      },
    },

    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },

    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
    },

    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: null,
    },

    providerPaymentId: {
      type: String,
      default: null,
    },

    providerOrderId: {
      type: String,
      default: null,
      index: true,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({
  method: 1,
  status: 1,
  createdAt: 1,
});

export const PaymentModel = model("Payment", paymentSchema);
