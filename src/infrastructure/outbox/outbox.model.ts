import { Schema, model } from "mongoose";

import { OUTBOX_STATUS } from "./outbox.types.js";

const outboxSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    eventName: {
      type: String,
      required: true,
      index: true,
    },

    aggregateType: {
      type: String,
      required: true,
    },

    aggregateId: {
      type: String,
      required: true,
      index: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(OUTBOX_STATUS),
      required: true,
      default: OUTBOX_STATUS.PENDING,
      index: true,
    },

    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    nextAttemptAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

outboxSchema.index({
  status: 1,
  nextAttemptAt: 1,
});

export const OutboxModel = model("Outbox", outboxSchema);
