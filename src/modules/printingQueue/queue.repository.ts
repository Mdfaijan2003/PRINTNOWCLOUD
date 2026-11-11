import mongoose from "mongoose";
import { PrintQueueModel } from "./queue.model.js";
import { PRINT_QUEUE_STATUS } from "./queue.status.js";

export class PrintQueueRepository {
  async findByPrintJobId(printJobId: string, session: mongoose.ClientSession) {
    return PrintQueueModel.findOne({ printJobId }).session(session);
  }

  async createWaitingEntry(printJobId: string, session: mongoose.ClientSession) {
    const [entry] = await PrintQueueModel.create([{
      printJobId,
      status: PRINT_QUEUE_STATUS.WAITING,
      priority: 0,
      queuedAt: new Date(),
    }], { session });
    return entry;
  }
}
