import type { Readable } from "node:stream";

export interface StorePutInput {
  objectKey: string;
  stream: Readable;
  contentType: string;
  size: number;
}

export interface Store {
  put(input: StorePutInput): Promise<void>;

  get(objectKey: string): Promise<Readable>;

  delete(objectKey: string): Promise<void>;

  exists(objectKey: string): Promise<boolean>;
}
