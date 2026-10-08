import type { FileStatus } from "./file.status.js";

export type FileValidationStatus = "PENDING" | "VALID" | "INVALID";

export interface FileOriginal {
  filename: string;
  mimeType: string;
  size: number;
}

export interface FileStorage {
  objectKey: string;
}

export interface FileAnalysis {
  pageCount?: number;
}

export interface FileValidation {
  status: FileValidationStatus;
  errors: string[];
  validatedAt?: Date;
}

export interface FileEntity {
  id: string;
  sessionId: string;

  original: FileOriginal;

  storage: FileStorage;

  analysis: FileAnalysis;

  validation: FileValidation;

  status: FileStatus;

  createdAt: Date;
  updatedAt: Date;
}
