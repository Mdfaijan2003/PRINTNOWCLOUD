export const PRINT_PRICES = {
  COLOR_PER_PAGE: 10,
  BW_PER_PAGE: 5,
} as const;

export const PHOTO_PRICES = {
  SIX: 30,
  TWELVE: 60,
} as const;

export type PrintColorMode = "COLOR" | "BW";

export type PhotoQuantity = 6 | 12;

export interface PrintPricingInput {
  colorMode: PrintColorMode;
  pages: number;
  copies?: number;
}

export interface PhotoPricingInput {
  quantity: PhotoQuantity;
}

/**
 * Calculates the price of a document print.
 *
 * Current pricing:
 * - Color: ₹10 per page
 * - B&W: ₹5 per page
 *
 * Paper size, orientation and duplex currently
 * do not affect pricing.
 */
export function calculatePrintPrice({
  colorMode,
  pages,
  copies = 1,
}: PrintPricingInput): number {
  if (!Number.isInteger(pages) || pages <= 0) {
    throw new Error("Pages must be a positive integer");
  }

  if (!Number.isInteger(copies) || copies <= 0) {
    throw new Error("Copies must be a positive integer");
  }

  const pricePerPage =
    colorMode === "COLOR"
      ? PRINT_PRICES.COLOR_PER_PAGE
      : PRINT_PRICES.BW_PER_PAGE;

  return pricePerPage * pages * copies;
}

/**
 * Calculates the price of photo printing.
 *
 * Current pricing:
 * - 6 photos: ₹30
 * - 12 photos: ₹60
 */
export function calculatePhotoPrice({ quantity }: PhotoPricingInput): number {
  switch (quantity) {
    case 6:
      return PHOTO_PRICES.SIX;

    case 12:
      return PHOTO_PRICES.TWELVE;

    default:
      throw new Error("Photo quantity must be either 6 or 12");
  }
}
