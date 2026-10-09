import { PrintJobRepository } from "./printJob.repository.js";
import { PrintJobService } from "./printJob.service.js";
import { PrintJobController } from "./printJob.controller.js";

const repository = new PrintJobRepository();

export const printJobService = new PrintJobService(repository);

export const printJobController = new PrintJobController(printJobService);
