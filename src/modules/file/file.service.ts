import type { Readable } from "node:stream";
import { Types } from "mongoose";
import path from "node:path";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";

import { FileProcessor } from "./file.processor.js";
import { fileUploadSchema, type FileUploadInput } from "./file.schema.js";
import { FILE_STATUS, type FileStatus } from "./file.status.js";
import { canTransitionFileStatus } from "./file.transition.js";
import type { FileEntity } from "./file.types.js";

import {
  FileDeletionError,
  FileMetadataError,
  FileNotFoundError,
  FileStorageError,
  InvalidFileTransitionError,
} from "./file.error.js";

import { FileRepository } from "./file.repository.js";

import type { Store } from "../../infrastructure/store/store.interface.js";

export interface UploadFileInput {
  sessionId: string;
  filename: string;
  mimeType: string;
  size: number;
  filePath: string;
}

export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly store: Store,
    private readonly fileProcessor: FileProcessor,
  ) {}

  async upload(input: UploadFileInput): Promise<FileEntity> {
    const validatedInput = fileUploadSchema.parse({
      sessionId: input.sessionId,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
    });

    const fileId = new Types.ObjectId();
    const fileIdString = fileId.toString();

    const extension = path.extname(validatedInput.filename);

    const objectKey =
      `sessions/${validatedInput.sessionId}` +
      `/files/${fileIdString}` +
      `/original${extension}`;

    let file: FileEntity;

    /*
     * Create the database record first.
     */
    try {
      file = await this.fileRepository.create({
        id: fileIdString,
        sessionId: validatedInput.sessionId,
        original: {
          filename: validatedInput.filename,
          mimeType: validatedInput.mimeType,
          size: validatedInput.size,
        },
        storage: {
          objectKey,
        },
        analysis: {},
        validation: {
          status: "PENDING",
          errors: [],
        },
        status: FILE_STATUS.RECEIVED,
      });
    } catch (error) {
      throw new FileMetadataError("Failed to create file metadata", {
        cause: error,
      });
    }

    /*
     * Validate + analyze the local temporary file.
     */
    const processedFile = await this.fileProcessor.process(
      file,
      input.filePath,
    );

    /*
     * Invalid document.
     *
     * No reason to upload an invalid document to Cloudinary.
     */
    if (processedFile.status === FILE_STATUS.FAILED) {
      return processedFile;
    }

    /*
     * Upload only after validation and analysis succeed.
     */
    try {
      await this.store.put({
        objectKey,
        stream: createReadStream(input.filePath),
        contentType: validatedInput.mimeType,
        size: validatedInput.size,
      });
    } catch (error) {
      await this.markStorageFailure(file.id);

      throw new FileStorageError("Failed to store uploaded file", {
        cause: error,
      });
    }

    /*
     * Storage succeeded.
     *
     * Now the file can safely become READY.
     */
    const readyFile = await this.fileRepository.transitionStatus(
      file.id,
      FILE_STATUS.PROCESSING,
      FILE_STATUS.READY,
    );

    if (!readyFile) {
      /*
       * Database state could not be updated after successful
       * storage. Attempt cleanup to avoid an orphaned object.
       */
      try {
        await this.store.delete(objectKey);
      } catch (cleanupError) {
        throw new FileMetadataError(
          "Failed to finalize file metadata and clean up stored object",
          { cause: cleanupError },
        );
      }

      throw new FileMetadataError("Failed to finalize file metadata");
    }

    return readyFile;
  }

  async getById(fileId: string, sessionId: string): Promise<FileEntity> {
    const file = await this.fileRepository.findByIdAndSession(
      fileId,
      sessionId,
    );

    if (!file) {
      throw new FileNotFoundError();
    }

    return file;
  }

  async getSessionFiles(sessionId: string): Promise<FileEntity[]> {
    return this.fileRepository.findBySessionId(sessionId);
  }

  async transitionStatus(
    fileId: string,
    nextStatus: FileStatus,
  ): Promise<FileEntity> {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new FileNotFoundError();
    }

    if (!canTransitionFileStatus(file.status, nextStatus)) {
      throw new InvalidFileTransitionError(file.status, nextStatus);
    }

    const updatedFile = await this.fileRepository.transitionStatus(
      file.id,
      file.status,
      nextStatus,
    );

    if (!updatedFile) {
      throw new InvalidFileTransitionError(file.status, nextStatus);
    }

    return updatedFile;
  }

  async updateValidation(
    fileId: string,
    validation: FileEntity["validation"],
  ): Promise<FileEntity> {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new FileNotFoundError();
    }

    const updatedFile = await this.fileRepository.updateValidation(
      fileId,
      validation,
    );

    if (!updatedFile) {
      throw new FileMetadataError("Failed to update file validation");
    }

    return updatedFile;
  }

  async updateAnalysis(
    fileId: string,
    analysis: FileEntity["analysis"],
  ): Promise<FileEntity> {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new FileNotFoundError();
    }

    const updatedFile = await this.fileRepository.updateAnalysis(
      fileId,
      analysis,
    );

    if (!updatedFile) {
      throw new FileMetadataError("Failed to update file analysis");
    }

    return updatedFile;
  }

  async delete(fileId: string, sessionId: string): Promise<void> {
    const file = await this.getById(fileId, sessionId);

    /*
     * TODO:
     * Check PrintJob references before allowing deletion.
     */

    try {
      await this.store.delete(file.storage.objectKey);
    } catch (error) {
      throw new FileDeletionError("Failed to remove file from storage", {
        cause: error,
      });
    }

    const deleted = await this.fileRepository.deleteById(file.id);

    if (!deleted) {
      throw new FileDeletionError(
        "File metadata could not be removed after storage deletion",
      );
    }
  }

  private async markStorageFailure(fileId: string): Promise<void> {
    await this.fileRepository.transitionStatus(
      fileId,
      FILE_STATUS.PROCESSING,
      FILE_STATUS.FAILED,
    );
  }
}
