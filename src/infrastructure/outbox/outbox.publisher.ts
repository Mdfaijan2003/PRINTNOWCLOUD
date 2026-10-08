import type { EventBus } from "../../shared/events/event-bus.interface.js";

import { OutboxRepository } from "./outbox.repository.js";

export class OutboxPublisher {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly eventBus: EventBus,
  ) {}

  async publishNext(): Promise<boolean> {
    const event = await this.outboxRepository.claimNext();

    if (!event) {
      return false;
    }

    try {
      await this.eventBus.publish({
        eventId: event.eventId,

        name: event.eventName,

        payload: event.payload,

        occurredAt: event.createdAt,
      });

      await this.outboxRepository.markPublished(event._id.toString());

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown outbox publishing error";

      const retryDelay = Math.min(
        60_000 * 2 ** Math.min(event.attempts, 5),
        15 * 60_000,
      );

      await this.outboxRepository.markFailed(
        event._id.toString(),
        errorMessage,
        new Date(Date.now() + retryDelay),
      );

      return false;
    }
  }
}
