import { FILE_STATUS, type FileStatus } from "./file.status.js";

export const fileTransitions: Record<FileStatus, readonly FileStatus[]> = {
  [FILE_STATUS.RECEIVED]: [FILE_STATUS.PROCESSING],

  [FILE_STATUS.PROCESSING]: [FILE_STATUS.READY, FILE_STATUS.FAILED],

  [FILE_STATUS.READY]: [],

  [FILE_STATUS.FAILED]: [],
};

export function canTransitionFileStatus(
  currentStatus: FileStatus,
  nextStatus: FileStatus,
): boolean {
  return fileTransitions[currentStatus].includes(nextStatus);
}
