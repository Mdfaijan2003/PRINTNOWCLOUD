import { Router } from "express";

import { FileController } from "./file.controller.js";
import { FileRepository } from "./file.repository.js";
import { FileService } from "./file.service.js";
import { FileValidator } from "./file.validator.js";
import { FileAnalyzer } from "./file.analyzer.js";
import { FileProcessor } from "./file.processor.js";

import { createStore } from "../../infrastructure/store/store.factory.js";
import { uploadMiddleware } from "../../infrastructure/upload/upload.middleware.js";

const fileRoutes = Router();
const fileRepository = new FileRepository();
const store = createStore();
const validator = new FileValidator();
const analyzer = new FileAnalyzer();
const fileProcessor = new FileProcessor(fileRepository, validator, analyzer);
const fileService = new FileService(fileRepository, store, fileProcessor);
const fileController = new FileController(fileService);

/**
 * POST /files
 *
 * Upload a file.
 *
 * multipart/form-data:
 * - file
 * - sessionId
 */
fileRoutes.post("/", uploadMiddleware.single("file"), (req, res, next) => {
  void fileController.upload(req as any, res, next);
});

/**
 * GET /files/session/:sessionId
 *
 * Get all files belonging to a session.
 */
fileRoutes.get("/session/:sessionId", fileController.getSessionFiles);

/**
 * GET /files/:fileId
 *
 * Get a specific file.
 *
 * Session ID is supplied through:
 * X-Session-ID header
 * or request body where applicable.
 */
fileRoutes.get("/:fileId", fileController.getById);

/**
 * DELETE /files/:fileId
 *
 * Delete a file.
 */
fileRoutes.delete("/:fileId", fileController.delete);

export default fileRoutes;
