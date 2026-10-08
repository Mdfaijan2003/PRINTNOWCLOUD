import { Router } from "express";

import { PrintJobRepository } from "./printJob.repository.js";
import { PrintJobService } from "./printJob.service.js";
import { PrintJobController } from "./printJob.controller.js";

const printJobRouter = Router();

const repository = new PrintJobRepository();

const service = new PrintJobService(repository);

const controller = new PrintJobController(service);

printJobRouter.post("/", controller.createJob);

printJobRouter.get("/:id", controller.getJobById);

printJobRouter.patch("/:id/status", controller.transitionStatus);

export default printJobRouter;
