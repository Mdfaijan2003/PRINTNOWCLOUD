import { fileTypeFromFile } from "file-type";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

import type { FileEntity } from "./file.types.js";

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  detectedMimeType?: string;
}

export class FileValidator {
  async validate(
    file: FileEntity,
    filePath: string,
  ): Promise<FileValidationResult> {
    const errors: string[] = [];

    /*
     * Detect the actual file type from its binary signature.
     */
    const detectedType = await fileTypeFromFile(filePath);

    if (!detectedType) {
      return {
        valid: false,
        errors: ["Unable to determine file type"],
      };
    }

    /*
     * Supported types for the MVP.
     */
    const supportedMimeTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);

    if (!supportedMimeTypes.has(detectedType.mime)) {
      errors.push(`Unsupported file type: ${detectedType.mime}`);

      return {
        valid: false,
        errors,
        detectedMimeType: detectedType.mime,
      };
    }

    /*
     * Compare the detected MIME type with the MIME type
     * declared by the client.
     */
    if (detectedType.mime !== file.original.mimeType) {
      errors.push(`File content type does not match declared MIME type`);
    }

    /*
     * Validate the actual content.
     */
    try {
      switch (detectedType.mime) {
        case "application/pdf":
          await this.validatePdf(filePath);
          break;

        case "image/jpeg":
        case "image/png":
          await this.validateImage(filePath);
          break;
      }
    } catch {
      errors.push(`File content is corrupted or cannot be processed`);
    }

    return {
      valid: errors.length === 0,
      errors,
      detectedMimeType: detectedType.mime,
    };
  }

  private async validatePdf(filePath: string): Promise<void> {
    const pdfBytes = await readFile(filePath);

    const pdf = await PDFDocument.load(pdfBytes);

    if (pdf.getPageCount() < 1) {
      throw new Error("PDF contains no pages");
    }
  }

  private async validateImage(filePath: string): Promise<void> {
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Image dimensions could not be determined");
    }

    if (metadata.width < 1 || metadata.height < 1) {
      throw new Error("Invalid image dimensions");
    }
  }
}
