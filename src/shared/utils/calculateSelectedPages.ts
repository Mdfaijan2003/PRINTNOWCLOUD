import type { PageSelection } from "../../modules/printJob/printJob.types.js";

interface CalculateSelectedPagesInput {
  pageCount: number;
  pageSelection: PageSelection;
}

export function calculateSelectedPages({
  pageCount,
  pageSelection,
}: CalculateSelectedPagesInput): number {
  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    throw new Error("Page count must be a positive integer");
  }

  switch (pageSelection.type) {
    case "ALL":
      return pageCount;

    case "PAGES": {
      const pages = pageSelection.pages;

      if (!pages?.length) {
        throw new Error("Pages are required");
      }

      const uniquePages = new Set(pages);

      if (uniquePages.size !== pages.length) {
        throw new Error("Duplicate pages are not allowed");
      }

      for (const page of pages) {
        if (page > pageCount) {
          throw new Error(`Page ${page} exceeds document page count`);
        }
      }

      return pages.length;
    }

    case "RANGES": {
      const ranges = pageSelection.ranges;

      if (!ranges?.length) {
        throw new Error("Ranges are required");
      }

      // Validate page boundaries first
      for (const range of ranges) {
        if (range.start > pageCount || range.end > pageCount) {
          throw new Error(
            `Range ${range.start}-${range.end} exceeds document page count`,
          );
        }
      }

      // Check overlapping ranges
      const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

      for (let i = 1; i < sortedRanges.length; i++) {
        const previous = sortedRanges[i - 1];
        const current = sortedRanges[i];

        if (!previous || !current) {
          continue;
        }

        if (current.start <= previous.end) {
          throw new Error(
            `Overlapping ranges are not allowed: ${previous.start}-${previous.end} and ${current.start}-${current.end}`,
          );
        }
      }

      return ranges.reduce(
        (total, range) => total + (range.end - range.start + 1),
        0,
      );
    }

    default:
      throw new Error("Invalid page selection type");
  }
}
