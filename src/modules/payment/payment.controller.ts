import type { Request, Response, NextFunction } from "express";

import { createPaymentSchema } from "./payment.schema.js";
import { PaymentService } from "./payment.service.js";

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createPayment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = createPaymentSchema.parse(req.body);

      const payment = await this.paymentService.createPayment(input);

      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          success: false,
          message: "Payment ID is required",
        });
        return;
      }

      const payment = await this.paymentService.getPaymentById(id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  approveCashPayment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          success: false,
          message: "Payment ID is required",
        });
        return;
      }

      const payment = await this.paymentService.approveCashPayment(id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectCashPayment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          success: false,
          message: "Payment ID is required",
        });
        return;
      }

      const payment = await this.paymentService.rejectCashPayment(id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  };

  getCashApprovalQueue = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payments = await this.paymentService.getCashApprovalQueue();

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  razorpayWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({
          success: false,
          message: "Raw webhook body is required",
        });
        return;
      }

      const signature = req.headers["x-razorpay-signature"];

      if (typeof signature !== "string" || !signature) {
        res.status(400).json({
          success: false,
          message: "Razorpay signature is missing",
        });
        return;
      }

      await this.paymentService.handleRazorpayWebhook(req.body, signature);

      console.log("RAZORPAY WEBHOOK RECEIVED");

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
