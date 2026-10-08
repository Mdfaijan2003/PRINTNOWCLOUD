import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { readFile } from "node:fs/promises";

import type { FileAnalysis } from "./file.types.js";

export class FileAnalyzer {
  async analyze(mimeType: string, filePath: string): Promise<FileAnalysis> {
    switch (mimeType) {
      case "application/pdf":
        return this.analyzePdf(filePath);

      case "image/jpeg":
      case "image/png":
        return this.analyzeImage(filePath);

      default:
        throw new Error(`Unsupported file type for analysis: ${mimeType}`);
    }
  }

  private async analyzePdf(filePath: string): Promise<FileAnalysis> {
    const pdfBytes = await readFile(filePath);

    const pdf = await PDFDocument.load(pdfBytes);

    return {
      pageCount: pdf.getPageCount(),
    };
  }

  private async analyzeImage(filePath: string): Promise<FileAnalysis> {
    await sharp(filePath).metadata();

    /*
     * An uploaded image represents one printable page.
     */
    return {
      pageCount: 1,
    };
  }
}
