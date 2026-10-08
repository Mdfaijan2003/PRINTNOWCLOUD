export interface DomainEvent<T = unknown> {
  eventId: string;
  name: string;
  payload: T;
  occurredAt: Date;
}

export interface EventBus {
  publish<T>(event: DomainEvent<T>): Promise<void>;

  subscribe<T>(
    eventName: string,
    handler: (event: DomainEvent<T>) => Promise<void>,
  ): void;
}
