import { Schema, model } from "mongoose";
import { PRINT_QUEUE_STATUS } from "./queue.status.js";

const printQueueSchema = new Schema({
  printJobId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  status: { type: String, enum: Object.values(PRINT_QUEUE_STATUS), required: true, default: PRINT_QUEUE_STATUS.WAITING, index: true },
  priority: { type: Number, required: true, default: 0 },
  queuedAt: { type: Date, required: true, default: Date.now, index: true },
}, { timestamps: true });

printQueueSchema.index({ status: 1, priority: -1, queuedAt: 1 });
export const PrintQueueModel = model("PrintQueue", printQueueSchema);
