import mongoose, { Schema, type Model } from "mongoose";

import type {
  DocumentPrintJobItem,
  PageRange,
  PageSelection,
  PhotoPrintJobItem,
  PrintJobItem,
  PrintJobPricing,
} from "./printJob.types.js";

import { PRINT_JOB_STATUS } from "./printJob.status.js";
import type { PrintJobStatus } from "./printJob.status.js";

interface PrintJobPersistence {
  items: PrintJobItem[];
  pricing: PrintJobPricing;
  status: PrintJobStatus;
  createdAt: Date;
  updatedAt: Date;
}

/* ---------------- PAGE SELECTION ---------------- */

const pageRangeSchema = new Schema<PageRange>(
  {
    start: {
      type: Number,
      required: true,
      min: 1,
    },

    end: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const pageSelectionSchema = new Schema<PageSelection>(
  {
    type: {
      type: String,
      enum: ["ALL", "PAGES", "RANGES"],
      required: true,
    },

    pages: {
      type: [Number],
      default: undefined,
    },

    ranges: {
      type: [pageRangeSchema],
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

/* ---------------- DOCUMENT CONFIG ---------------- */

const documentPrintConfigurationSchema = new Schema<
  DocumentPrintJobItem["printConfiguration"]
>(
  {
    colorMode: {
      type: String,
      enum: ["COLOR", "BW"],
      required: true,
    },

    paperSize: {
      type: String,
      enum: ["A4", "A3"],
      required: true,
    },

    orientation: {
      type: String,
      enum: ["PORTRAIT", "LANDSCAPE"],
      required: true,
    },

    duplex: {
      type: String,
      enum: ["SINGLE", "DOUBLE"],
      required: true,
    },

    copies: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },

    pageSelection: {
      type: pageSelectionSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

/* ---------------- PHOTO CONFIG ---------------- */

const photoPrintConfigurationSchema = new Schema<
  PhotoPrintJobItem["photoConfiguration"]
>(
  {
    size: {
      type: String,
      enum: ["PASSPORT", "STAMP"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

/* ---------------- PRICING ---------------- */

const printItemPricingSchema = new Schema(
  {
    selectedPages: {
      type: Number,
      min: 1,
    },

    totalPrintPages: {
      type: Number,
      min: 1,
    },

    quantity: {
      type: Number,
      min: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const printJobPricingSchema = new Schema<PrintJobPricing>(
  {
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
    },
  },
  {
    _id: false,
  },
);

/* ---------------- ITEMS ---------------- */

const documentPrintJobItemSchema = new Schema<DocumentPrintJobItem>(
  {
    type: {
      type: String,
      enum: ["DOCUMENT"],
      required: true,
    },

    fileId: {
      type: String,
      required: true,
    },

    pageCount: {
      type: Number,
      required: true,
      min: 1,
    },

    printConfiguration: {
      type: documentPrintConfigurationSchema,
      required: true,
    },

    pricing: {
      type: printItemPricingSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const photoPrintJobItemSchema = new Schema<PhotoPrintJobItem>(
  {
    type: {
      type: String,
      enum: ["PHOTO"],
      required: true,
    },

    fileId: {
      type: String,
      required: true,
    },

    photoConfiguration: {
      type: photoPrintConfigurationSchema,
      required: true,
    },

    pricing: {
      type: printItemPricingSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

/* ---------------- PRINT JOB ---------------- */

const printJobSchema = new Schema<PrintJobPersistence>(
  {
    items: {
      type: [
        {
          type: {
            type: String,
            enum: ["DOCUMENT", "PHOTO"],
            required: true,
          },

          fileId: {
            type: String,
            required: true,
          },

          pageCount: {
            type: Number,
            min: 1,
          },

          printConfiguration: {
            type: documentPrintConfigurationSchema,
          },

          photoConfiguration: {
            type: photoPrintConfigurationSchema,
          },

          pricing: {
            type: printItemPricingSchema,
            required: true,
          },
        },
      ],
      required: true,

      validate: {
        validator: (value: PrintJobItem[]) => value.length > 0,
        message: "At least one PrintJob item is required",
      },
    },

    pricing: {
      type: printJobPricingSchema,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(PRINT_JOB_STATUS),
      required: true,
      default: PRINT_JOB_STATUS.CREATED,
    },
  },
  {
    timestamps: true,
  },
);

export const PrintJobModel: Model<PrintJobPersistence> =
  mongoose.model<PrintJobPersistence>("PrintJob", printJobSchema);
