export const PRINT_QUEUE_STATUS = { WAITING: "WAITING" } as const;
export type PrintQueueStatus = (typeof PRINT_QUEUE_STATUS)[keyof typeof PRINT_QUEUE_STATUS];
