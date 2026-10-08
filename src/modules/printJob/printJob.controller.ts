import type { Request, Response, NextFunction } from "express";
import {
  createPrintJobSchema,
  updatePrintJobStatusSchema,
} from "./printJob.schema.js";

import { PrintJobService } from "./printJob.service.js";

export class PrintJobController {
  constructor(private readonly printJobService: PrintJobService) {}

  createJob = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = createPrintJobSchema.parse(req.body);

      const printJobId = await this.printJobService.createJob(input);

      res.status(201).json({
        success: true,
        data: {
          printJobId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getJobById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        res.status(400).json({
          success: false,
          message: "Print job ID is required",
        });
        return;
      }

      const job = await this.printJobService.getJobById(id);

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };

  transitionStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const { status } = updatePrintJobStatusSchema.parse(req.body);
      if (!id || Array.isArray(id)) {
        res.status(400).json({
          success: false,
          message: "Print job ID is required",
        });
        return;
      }
      const job = await this.printJobService.transitionStatus(id, status);

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  };
}
