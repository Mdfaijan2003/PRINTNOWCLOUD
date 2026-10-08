import type { ErrorRequestHandler, Request } from "express";
import { ZodError } from "zod";

import {
  FileDeletionError,
  FileMetadataError,
  FileNotFoundError,
  FileStorageError,
  InvalidFileTransitionError,
} from "../modules/file/file.error.js";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Internal server error";
}

function isMulterError(error: unknown): error is Error & { code: string } {
  return error instanceof Error && error.name === "MulterError" && "code" in error;
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

function getRequestId(req: Request): string | undefined {
  const requestId = req.headers["x-request-id"];

  if (typeof requestId === "string") {
    return requestId;
  }

  return undefined;
}

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
): void => {
  const requestId = getRequestId(req);

  /*
   * --------------------------------------------------
   * File domain errors
   * --------------------------------------------------
   */

  if (error instanceof FileNotFoundError) {
    res.status(404).json({
      success: false,
      message: error.message,
      ...(requestId && { requestId }),
    });
    return;
  }

  if (error instanceof InvalidFileTransitionError) {
    res.status(409).json({
      success: false,
      message: error.message,
      ...(requestId && { requestId }),
    });
    return;
  }

  if (
    error instanceof FileStorageError ||
    error instanceof FileMetadataError ||
    error instanceof FileDeletionError
  ) {
    console.error("File operation error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
      ...(requestId && { requestId }),
    });
    return;
  }

  /*
   * --------------------------------------------------
   * Zod validation errors
   * --------------------------------------------------
   */

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
      ...(requestId && { requestId }),
    });
    return;
  }

  /*
   * --------------------------------------------------
   * Multer upload errors
   * --------------------------------------------------
   */

  if (isMulterError(error)) {
    let message = "File upload failed";

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message = "File size exceeds the allowed limit";
        break;

      case "LIMIT_FILE_COUNT":
        message = "Too many files uploaded";
        break;

      case "LIMIT_UNEXPECTED_FILE":
        message = "Unexpected file field";
        break;

      case "LIMIT_FIELD_COUNT":
        message = "Too many form fields";
        break;

      case "LIMIT_FIELD_SIZE":
        message = "Form field is too large";
        break;
    }

    res.status(400).json({
      success: false,
      message,
      ...(requestId && { requestId }),
    });
    return;
  }

  /*
   * --------------------------------------------------
   * Unknown / unexpected errors
   * --------------------------------------------------
   */

  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(isDevelopment() &&
      error instanceof Error && {
        error: error.message,
      }),
    ...(requestId && { requestId }),
  });
};
