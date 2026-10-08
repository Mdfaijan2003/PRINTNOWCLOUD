import { Schema, model, type HydratedDocument } from "mongoose";

import { FILE_STATUS, type FileStatus } from "./file.status.js";
import type {
  FileAnalysis,
  FileOriginal,
  FileStorage,
  FileValidation,
  FileValidationStatus,
} from "./file.types.js";

export interface FileDocumentShape {
  sessionId: string;
  original: FileOriginal;
  storage: FileStorage;
  analysis: FileAnalysis;
  validation: FileValidation;
  status: FileStatus;
}

export type FileDocument = HydratedDocument<FileDocumentShape>;

const fileSchema = new Schema<FileDocumentShape>(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    original: {
      filename: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },

      size: {
        type: Number,
        required: true,
        min: 1,
      },
    },

    storage: {
      objectKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
    },

    analysis: {
      pageCount: {
        type: Number,
        min: 1,
      },
    },

    validation: {
      status: {
        type: String,
        enum: ["PENDING", "VALID", "INVALID"] satisfies FileValidationStatus[],
        required: true,
        default: "PENDING",
      },

      errors: {
        type: [String],
        default: [],
      },

      validatedAt: {
        type: Date,
      },
    },

    status: {
      type: String,
      enum: Object.values(FILE_STATUS),
      required: true,
      default: FILE_STATUS.RECEIVED,
      index: true,
    },
  },

  {
    timestamps: true,
    versionKey: false,
  },
);

fileSchema.index({
  sessionId: 1,
  createdAt: 1,
});

export const FileModel = model<FileDocumentShape>("File", fileSchema);
