import { z } from "zod";

const pageRangeSchema = z
  .object({
    start: z.number().int().positive(),
    end: z.number().int().positive(),
  })
  .refine((range) => range.end >= range.start, {
    message: "Range end must be greater than or equal to range start",
    path: ["end"],
  });

const pageSelectionSchema = z
  .object({
    type: z.enum(["ALL", "PAGES", "RANGES"]),

    pages: z.array(z.number().int().positive()).optional(),

    ranges: z.array(pageRangeSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "PAGES" && !value.pages?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["pages"],
        message: "Pages are required when selection type is PAGES",
      });
    }

    if (value.type === "RANGES" && !value.ranges?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["ranges"],
        message: "Ranges are required when selection type is RANGES",
      });
    }
  });

/* ---------------- DOCUMENT ---------------- */

const printConfigurationSchema = z.object({
  colorMode: z.enum(["COLOR", "BW"]),

  paperSize: z.enum(["A4", "A3"]),

  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]),

  duplex: z.enum(["SINGLE", "DOUBLE"]),

  copies: z.number().int().positive().max(100),

  pageSelection: pageSelectionSchema,
});

const documentPrintJobItemSchema = z.object({
  type: z.literal("DOCUMENT"),

  fileId: z.string().uuid(),

  pageCount: z.number().int().positive(),

  printConfiguration: printConfigurationSchema,
});

/* ---------------- PHOTO ---------------- */

const photoPrintConfigurationSchema = z.object({
  size: z.enum(["PASSPORT", "STAMP"]),

  quantity: z.union([z.literal(6), z.literal(12)]),
});

const photoPrintJobItemSchema = z.object({
  type: z.literal("PHOTO"),

  fileId: z.string().uuid(),

  photoConfiguration: photoPrintConfigurationSchema,
});

/* ---------------- PRINT JOB ITEM ---------------- */

const printJobItemSchema = z.discriminatedUnion("type", [
  documentPrintJobItemSchema,
  photoPrintJobItemSchema,
]);

/* ---------------- CREATE ---------------- */

export const createPrintJobSchema = z.object({
  items: z.array(printJobItemSchema).min(1),
});

/* ---------------- STATUS UPDATE ---------------- */

export const updatePrintJobStatusSchema = z.object({
  status: z.enum([
    "CREATED",
    "PROCESSING",
    "PAYMENT_REQUIRED",
    "QUEUED",
    "DISPATCHED",
    "PRINTING",
    "COMPLETED",
    "PROCESSING_FAILED",
    "PRINT_FAILED",
    "CANCELLED",
  ]),
});

/*
API REQUEST EXAMPLE

{
  "items": [
    {
      "type": "DOCUMENT",
      "fileId": "550e8400-e29b-41d4-a716-446655440000",
      "pageCount": 10,
      "printConfiguration": {
        "colorMode": "COLOR",
        "paperSize": "A4",
        "orientation": "PORTRAIT",
        "duplex": "SINGLE",
        "copies": 2,
        "pageSelection": {
          "type": "PAGES",
          "pages": [1, 3, 5]
        }
      }
    },
    {
      "type": "PHOTO",
      "fileId": "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      "photoConfiguration": {
        "size": "PASSPORT",
        "quantity": 6
      }
    }
  ]
}
*/
