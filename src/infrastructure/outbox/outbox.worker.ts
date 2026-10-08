import { OutboxPublisher } from "./outbox.publisher.js";

export function startOutboxWorker(publisher: OutboxPublisher): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      while (await publisher.publishNext()) {}
    } catch (error) {
      console.error("Outbox worker error:", error);
    }
  }, 1000);
}
