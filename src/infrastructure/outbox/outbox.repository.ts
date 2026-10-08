import mongoose from "mongoose";
import { randomUUID } from "crypto";

import { OutboxModel } from "./outbox.model.js";
import { OUTBOX_STATUS } from "./outbox.types.js";

interface CreateOutboxEventInput {
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
}

export class OutboxRepository {
  async create(data: CreateOutboxEventInput, session: mongoose.ClientSession) {
    const eventId = randomUUID();

    const [event] = await OutboxModel.create(
      [
        {
          eventId,

          ...data,

          status: OUTBOX_STATUS.PENDING,
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      ],
      { session },
    );

    return event;
  }

  async claimNext() {
    const now = new Date();

    return OutboxModel.findOneAndUpdate(
      {
        $or: [
          {
            status: OUTBOX_STATUS.PENDING,
            nextAttemptAt: { $lte: now },
          },
          {
            status: OUTBOX_STATUS.FAILED,
            nextAttemptAt: { $lte: now },
          },
          {
            status: OUTBOX_STATUS.PROCESSING,
            lockedUntil: { $lte: now },
          },
        ],
      },
      {
        $set: {
          status: OUTBOX_STATUS.PROCESSING,
          lockedUntil: new Date(now.getTime() + 60_000),
        },

        $inc: {
          attempts: 1,
        },
      },
      {
        sort: {
          createdAt: 1,
        },

        new: true,
      },
    );
  }

  async markPublished(id: string) {
    return OutboxModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: OUTBOX_STATUS.PUBLISHED,
          publishedAt: new Date(),
          lockedUntil: null,
          lastError: null,
        },
      },
      {
        new: true,
      },
    );
  }

  async markFailed(id: string, error: string, retryAt: Date) {
    return OutboxModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: OUTBOX_STATUS.FAILED,
          lockedUntil: null,
          lastError: error,
          nextAttemptAt: retryAt,
        },
      },
      {
        new: true,
      },
    );
  }
}
