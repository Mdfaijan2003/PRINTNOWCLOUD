import { Router } from "express";
import { printJobController } from "./printJob.container.js";

const printJobRouter = Router();

printJobRouter.post("/", printJobController.createJob);
printJobRouter.get("/:id", printJobController.getJobById);
printJobRouter.patch("/:id/status", printJobController.transitionStatus);

export default printJobRouter;
