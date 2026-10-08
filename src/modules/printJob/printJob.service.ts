import crypto from "node:crypto";

import { PrintJobRepository } from "./printJob.repository.js";

import { PRINT_JOB_STATUS, type PrintJobStatus } from "./printJob.status.js";
import { PRINT_JOB_TRANSITIONS } from "./printJob.transition.js";

import type { PrintJob, PrintJobItem } from "./printJob.types.js";

import {
  calculatePrintPrice,
  calculatePhotoPrice,
} from "../../shared/utils/pricing.js";

import { calculateSelectedPages } from "../../shared/utils/calculateSelectedPages.js";

export type CreatePrintJobItemInput =
  | Omit<Extract<PrintJobItem, { type: "DOCUMENT" }>, "pricing">
  | Omit<Extract<PrintJobItem, { type: "PHOTO" }>, "pricing">;

export interface CreatePrintJobInput {
  items: CreatePrintJobItemInput[];
}

export class PrintJobService {
  constructor(private readonly repository: PrintJobRepository) {}

  async createJob(input: CreatePrintJobInput): Promise<string> {
    if (!input.items?.length) {
      throw new Error("At least one PrintJob item is required");
    }

    const items: PrintJobItem[] = input.items.map((item) => {
      if (!item.fileId?.trim()) {
        throw new Error("Each PrintJob item must have a file ID");
      }

      if (item.type === "DOCUMENT") {
        const selectedPages = calculateSelectedPages({
          pageCount: item.pageCount,
          pageSelection: item.printConfiguration.pageSelection,
        });

        const totalPrintPages = selectedPages * item.printConfiguration.copies;

        const amount = calculatePrintPrice({
          colorMode: item.printConfiguration.colorMode,
          pages: selectedPages,
          copies: item.printConfiguration.copies,
        });

        return {
          ...item,
          pricing: {
            selectedPages,
            totalPrintPages,
            amount,
          },
        };
      }

      const amount = calculatePhotoPrice({
        quantity: item.photoConfiguration.quantity,
      });

      return {
        ...item,
        pricing: {
          quantity: item.photoConfiguration.quantity,
          amount,
        },
      };
    });

    const subtotal = items.reduce(
      (total, item) => total + item.pricing.amount,
      0,
    );

    const totalAmount = subtotal;

    const printJob = await this.repository.create({
      items,
      pricing: {
        subtotal,
        totalAmount,
        currency: "INR",
      },
      status: PRINT_JOB_STATUS.PAYMENT_REQUIRED,
    });

    return printJob.id;
  }

  async getJobById(id: string): Promise<PrintJob> {
    if (!id?.trim()) {
      throw new Error("Print job ID is required");
    }

    const job = await this.repository.findById(id);

    if (!job) {
      throw new Error("Print job not found");
    }

    return job;
  }

  async transitionStatus(
    id: string,
    nextStatus: PrintJobStatus,
  ): Promise<PrintJob> {
    if (!id?.trim()) {
      throw new Error("Print job ID is required");
    }

    const job = await this.repository.findById(id);

    if (!job) {
      throw new Error("Print job not found");
    }

    const allowedTransitions = PRINT_JOB_TRANSITIONS[job.status];

    if (!allowedTransitions.includes(nextStatus)) {
      throw new Error(
        `Invalid PrintJob transition: ${job.status} → ${nextStatus}`,
      );
    }

    const updatedJob = await this.repository.updateStatus(id, nextStatus);

    if (!updatedJob) {
      throw new Error("Failed to update PrintJob status");
    }

    return updatedJob;
  }
}
