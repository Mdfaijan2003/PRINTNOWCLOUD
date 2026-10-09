import { env } from "./src/config/env.js";
import { app } from "./src/app.js";
import { connectDatabase } from "./src/infrastructure/database/mongoDB.js";
import { startPrintJobGrpcServer } from "./src/infrastructure/grpc/grpc.server.js";

const PORT = Number(env.PORT) || 5001;
const HOST = "0.0.0.0";

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    console.log("MongoDB connected");

    startPrintJobGrpcServer();
    // Start Express server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("Server is running!");
      console.log(`API Base: http://localhost:${PORT}/`);
      console.log(`MODE: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    const shutdown = (): void => {
      console.log("\n Shutting down server ...");
      server.close(() => {
        console.log(" HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Server failed to start:", err.message);
    } else {
      console.error("Server failed to start:", err);
    }
    process.exit(1);
  }
}

startServer();
