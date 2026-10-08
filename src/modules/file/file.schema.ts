import { z } from "zod";

export const fileUploadSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(1, "Session ID is required")
    .max(128, "Session ID is too long"),

  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename is too long"),

  mimeType: z
    .string()
    .trim()
    .min(1, "MIME type is required")
    .max(255, "MIME type is too long"),

  size: z.number().int().positive("File size must be greater than 0"),
});

export type FileUploadInput = z.infer<typeof fileUploadSchema>;
