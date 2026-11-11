import mongoose, { type Types } from "mongoose";

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

  async findByIdInSession(
    id: string,
    session: mongoose.ClientSession,
  ): Promise<PrintJob | null> {
    const doc = await PrintJobModel.findById(id).session(session).lean();
    return doc ? this.toDomain(doc as unknown as PrintJobDocumentLike) : null;
  }

  async transitionToQueued(
    id: string,
    session: mongoose.ClientSession,
  ): Promise<PrintJob | null> {
    const doc = await PrintJobModel.findOneAndUpdate(
      { _id: id, status: "PAYMENT_REQUIRED" },
      { $set: { status: "QUEUED" } },
      { session, returnDocument: "after", runValidators: true },
    ).lean();
    return doc ? this.toDomain(doc as unknown as PrintJobDocumentLike) : null;
  }

  async updateStatus(
    id: string,
    status: PrintJobStatus,
  ): Promise<PrintJob | null> {
    const doc = await PrintJobModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { returnDocument: "after", runValidators: true },
    ).lean();
    return doc ? this.toDomain(doc as unknown as PrintJobDocumentLike) : null;
  }
}
