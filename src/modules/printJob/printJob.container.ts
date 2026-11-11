import { PrintJobRepository } from "./printJob.repository.js";
import { PrintJobService } from "./printJob.service.js";
import { PrintJobController } from "./printJob.controller.js";
import { PrintQueueRepository } from "../printingQueue/queue.repository.js";

const repository = new PrintJobRepository();

const queueRepository = new PrintQueueRepository();

export const printJobService = new PrintJobService(repository, queueRepository);

export const printJobController = new PrintJobController(printJobService);
