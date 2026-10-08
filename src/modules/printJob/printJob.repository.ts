import type { Types } from "mongoose";

import { PrintJobModel } from "./printJob.model.js";

import type {
  PrintJob,
  PrintJobItem,
  PrintJobPricing,
} from "./printJob.types.js";

import type { PrintJobStatus } from "./printJob.status.js";

interface PrintJobDocumentLike {
  _id: Types.ObjectId;
  items: PrintJobItem[];
  pricing: PrintJobPricing;
  status: PrintJobStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class PrintJobRepository {
  private toDomain(document: PrintJobDocumentLike): PrintJob {
    return {
      id: document._id.toString(),
      items: document.items,
      pricing: document.pricing,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  async create(data: {
    items: PrintJobItem[];
    pricing: PrintJobPricing;
    status: PrintJobStatus;
  }): Promise<PrintJob> {
    const printJob = await PrintJobModel.create({
      items: data.items,
      pricing: data.pricing,
      status: data.status,
    });

    return this.toDomain(printJob.toObject() as PrintJobDocumentLike);
  }

  async findById(id: string): Promise<PrintJob | null> {
    const printJob = await PrintJobModel.findById(id).lean();

    if (!printJob) {
      return null;
    }

    return this.toDomain(printJob as unknown as PrintJobDocumentLike);
  }

  async updateStatus(
    id: string,
    status: PrintJobStatus,
  ): Promise<PrintJob | null> {
    const printJob = await PrintJobModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!printJob) {
      return null;
    }

    return this.toDomain(printJob as unknown as PrintJobDocumentLike);
  }
}
