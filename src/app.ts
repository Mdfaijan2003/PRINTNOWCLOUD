import express, { type Express, type Request, type Response } from "express";
import printJobRouter from "./modules/printJob/printJob.routes.js";
import fileRoutes from "./modules/file/file.routes.js";
import { createPaymentRouter } from "./modules/payment/payment.routes.js";
import { paymentController } from "./modules/payment/payment.container.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app: Express = express();

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
