import type { DomainEvent, EventBus } from "./event-bus.interface.js";

type EventHandler = (event: DomainEvent) => Promise<void>;

export class InProcessEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe<T>(
    eventName: string,
    handler: (event: DomainEvent<T>) => Promise<void>,
  ): void {
    const handlers = this.handlers.get(eventName) ?? [];

    handlers.push(handler as EventHandler);

    this.handlers.set(eventName, handlers);
  }

  async publish<T>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];

    await Promise.all(handlers.map((handler) => handler(event)));
  }
}
