import type { FileRepository } from "./file.repository.js";
import { FILE_STATUS } from "./file.status.js";
import { FileMetadataError, InvalidFileTransitionError } from "./file.error.js";
import { FileValidator } from "./file.validator.js";
import { FileAnalyzer } from "./file.analyzer.js";
import type { FileEntity } from "./file.types.js";

export class FileProcessor {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly validator: FileValidator,
    private readonly analyzer: FileAnalyzer,
  ) {}

  async process(file: FileEntity, filePath: string): Promise<FileEntity> {
    const processingFile = await this.fileRepository.transitionStatus(
      file.id,
      FILE_STATUS.RECEIVED,
      FILE_STATUS.PROCESSING,
    );

    if (!processingFile) {
      throw new InvalidFileTransitionError(
        FILE_STATUS.RECEIVED,
        FILE_STATUS.PROCESSING,
      );
    }

    try {
      const validation = await this.validator.validate(
        processingFile,
        filePath,
      );

      const validationUpdated = await this.fileRepository.updateValidation(
        file.id,
        {
          status: validation.valid ? "VALID" : "INVALID",
          errors: validation.errors,
          validatedAt: new Date(),
        },
      );

      if (!validationUpdated) {
        throw new FileMetadataError("Failed to update file validation");
      }

      /*
       * The document itself is invalid.
       * This is an expected business outcome, not an infrastructure error.
       */
      if (!validation.valid) {
        const failedFile = await this.fileRepository.transitionStatus(
          file.id,
          FILE_STATUS.PROCESSING,
          FILE_STATUS.FAILED,
        );

        if (!failedFile) {
          throw new InvalidFileTransitionError(
            FILE_STATUS.PROCESSING,
            FILE_STATUS.FAILED,
          );
        }

        return failedFile;
      }

      if (!validation.detectedMimeType) {
        throw new FileMetadataError("Validated file type is unavailable");
      }

      let analysis;

      try {
        analysis = await this.analyzer.analyze(
          validation.detectedMimeType,
          filePath,
        );
      } catch (error) {
        throw new FileMetadataError("Failed to analyze file", { cause: error });
      }

      const analysisUpdated = await this.fileRepository.updateAnalysis(
        file.id,
        analysis,
      );

      if (!analysisUpdated) {
        throw new FileMetadataError("Failed to update file analysis");
      }

      return analysisUpdated;
    } catch (error) {
      /*
       * Any unexpected/infrastructure failure means processing
       * failed. We deliberately do not change validation to INVALID.
       */
      if (
        error instanceof FileMetadataError ||
        error instanceof InvalidFileTransitionError
      ) {
        await this.markProcessingFailed(file.id);
        throw error;
      }

      await this.markProcessingFailed(file.id);

      throw new FileMetadataError("File processing failed", { cause: error });
    }
  }

  private async markProcessingFailed(fileId: string): Promise<void> {
    await this.fileRepository.transitionStatus(
      fileId,
      FILE_STATUS.PROCESSING,
      FILE_STATUS.FAILED,
    );
  }
}
