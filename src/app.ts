import express, { type Express, type Request, type Response } from "express";
import printJobRouter from "./modules/printJob/printJob.routes.js";
import fileRoutes from "./modules/file/file.routes.js";
import { createPaymentRouter } from "./modules/payment/payment.routes.js";
import { paymentController } from "./modules/payment/payment.container.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app: Express = express();

const allowedOrigins = [
  "http:localhost:5173",
  "https://print-now-one.vercel.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Session-ID",
    );
  }

  if (req.method === "OPTIONS") {
    if (origin && !allowedOrigins.includes(origin)) {
      return res.sendStatus(403);
    }

    return res.sendStatus(204);
  }

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed",
    });
  }

  next();
});

app.use(
  "/payments/webhook/razorpay",
  express.raw({ type: "application/json" }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/print-jobs", printJobRouter);
app.use("/files", fileRoutes);
app.use("/payments", createPaymentRouter(paymentController));

app.use(errorMiddleware);
export { app };
