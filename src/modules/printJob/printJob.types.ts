import type { PrintJobStatus } from "./printJob.status.js";

export type PrintJobItemType = "DOCUMENT" | "PHOTO";

export type ColorMode = "COLOR" | "BW";

export type PaperSize = "A4" | "A3";

export type Orientation = "PORTRAIT" | "LANDSCAPE";

export type DuplexMode = "SINGLE" | "DOUBLE";

export type PageSelectionType = "ALL" | "PAGES" | "RANGES";

export type PhotoSize = "PASSPORT" | "STAMP";

export interface PageRange {
  start: number;
  end: number;
}

export type PhotoQuantity = 6 | 12;

export interface PageSelection {
  type: PageSelectionType;
  pages?: number[] | undefined;
  ranges?: PageRange[] | undefined;
}

export interface DocumentPrintConfiguration {
  colorMode: ColorMode;
  paperSize: PaperSize;
  orientation: Orientation;
  duplex: DuplexMode;
  copies: number;
  pageSelection: PageSelection;
}

export interface PhotoPrintConfiguration {
  size: PhotoSize;
  quantity: PhotoQuantity;
}

export interface PrintItemPricing {
  selectedPages?: number;
  totalPrintPages?: number;
  quantity?: PhotoQuantity;
  amount: number;
}

export interface DocumentPrintJobItem {
  type: "DOCUMENT";
  fileId: string;
  pageCount: number;
  printConfiguration: DocumentPrintConfiguration;
  pricing: PrintItemPricing;
}

export interface PhotoPrintJobItem {
  type: "PHOTO";
  fileId: string;
  photoConfiguration: PhotoPrintConfiguration;
  pricing: PrintItemPricing;
}

export type PrintJobItem = DocumentPrintJobItem | PhotoPrintJobItem;

export interface PrintJobPricing {
  subtotal: number;
  totalAmount: number;
  currency: string;
}

export interface PrintJob {
  id: string;
  items: PrintJobItem[];
  pricing: PrintJobPricing;
  status: PrintJobStatus;
  createdAt: Date;
  updatedAt: Date;
}
