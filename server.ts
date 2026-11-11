import { env } from "./src/config/env.js";
import { app } from "./src/app.js";
import { connectDatabase } from "./src/infrastructure/database/mongoDB.js";
import { startPrintJobGrpcServer } from "./src/infrastructure/grpc/grpc.server.js";
import { InProcessEventBus } from "./src/shared/events/in-process-event-bus.js";
import { OutboxRepository } from "./src/infrastructure/outbox/outbox.repository.js";
import { OutboxPublisher } from "./src/infrastructure/outbox/outbox.publisher.js";
import { startOutboxWorker } from "./src/infrastructure/outbox/outbox.worker.js";
import { printJobService } from "./src/modules/printJob/printJob.container.js";
import { registerPrintJobPaymentHandlers } from "./src/modules/printJob/events/register-payment-handlers.js";

const PORT = Number(env.PORT) || 5001;
const HOST = "0.0.0.0";

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    console.log("MongoDB connected");

    // Register subscribers before polling the Outbox.
    const eventBus = new InProcessEventBus();
    registerPrintJobPaymentHandlers(eventBus, printJobService);
    const publisher = new OutboxPublisher(new OutboxRepository(), eventBus);
    const outboxWorker = startOutboxWorker(publisher);

    startPrintJobGrpcServer();
    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      console.log(`HTTP server listening on ${PORT}`);
      console.log(`MODE: ${env.NODE_ENV}`);
      console.log("Outbox worker started");
    });

    // Graceful shutdown
    let shuttingDown = false;
    const shutdown = (): void => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log("Shutting down PrintNow...");
      clearInterval(outboxWorker);
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error: unknown) {
    console.error(
      "Server failed to start:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

void startServer();
