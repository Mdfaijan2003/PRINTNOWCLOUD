import type { Request, Response, NextFunction } from "express";
import { unlink } from "node:fs/promises";
import { FileService } from "./file.service.js";

type FileUploadRequest = Request & {
  file?: {
    originalname: string;
    mimetype: string;
    size: number;
    path: string;
  };
};

export class FileController {
  constructor(private readonly fileService: FileService) {}

  upload = async (
    req: FileUploadRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const uploadedFile = req.file;

      if (!uploadedFile) {
        res.status(400).json({
          success: false,
          message: "File is required",
        });
        return;
      }

      const sessionId = this.getSessionId(req);

      if (!sessionId) {
        await this.removeTemporaryFile(uploadedFile.path);

        res.status(400).json({
          success: false,
          message: "Session ID is required",
        });
        return;
      }

      try {
        const file = await this.fileService.upload({
          sessionId,
          filename: uploadedFile.originalname,
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size,
          filePath: uploadedFile.path,
        });

        res.status(201).json({
          success: true,
          data: {
            id: file.id,
            sessionId: file.sessionId,
            original: file.original,
            status: file.status,
            validation: file.validation,
            analysis: file.analysis,
            createdAt: file.createdAt,
          },
        });
      } finally {
        await this.removeTemporaryFile(uploadedFile.path);
      }
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const sessionId = this.getSessionId(req);

      if (
        typeof fileId !== "string" ||
        !fileId ||
        typeof sessionId !== "string" ||
        !sessionId
      ) {
        res.status(400).json({
          success: false,
          message: "File ID and session ID are required",
        });
        return;
      }

      const file = await this.fileService.getById(fileId, sessionId);

      res.status(200).json({
        success: true,
        data: {
          id: file.id,
          sessionId: file.sessionId,
          original: file.original,
          analysis: file.analysis,
          validation: file.validation,
          status: file.status,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getSessionFiles = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sessionId = req.params.sessionId;

      if (typeof sessionId !== "string" || !sessionId) {
        res.status(400).json({
          success: false,
          message: "Session ID is required",
        });
        return;
      }

      const files = await this.fileService.getSessionFiles(sessionId);

      res.status(200).json({
        success: true,
        data: files.map((file) => ({
          id: file.id,
          sessionId: file.sessionId,
          original: file.original,
          analysis: file.analysis,
          validation: file.validation,
          status: file.status,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { fileId } = req.params;
      const sessionId = this.getSessionId(req);

      if (
        typeof fileId !== "string" ||
        !fileId ||
        typeof sessionId !== "string" ||
        !sessionId
      ) {
        res.status(400).json({
          success: false,
          message: "File ID and session ID are required",
        });
        return;
      }

      await this.fileService.delete(fileId, sessionId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  private getSessionId(req: Request): string | undefined {
    const sessionId =
      typeof req.body?.sessionId === "string"
        ? req.body.sessionId
        : typeof req.headers["x-session-id"] === "string"
          ? req.headers["x-session-id"]
          : undefined;

    if (!sessionId) {
      return undefined;
    }

    const normalized = sessionId.trim();

    return normalized.length > 0 ? normalized : undefined;
  }

  private async removeTemporaryFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // Temporary cleanup failure should not
      // hide the original request error.
    }
  }
}
