export const FILE_STATUS = {
  RECEIVED: "RECEIVED",
  PROCESSING: "PROCESSING",
  READY: "READY",
  FAILED: "FAILED",
} as const;

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS];
