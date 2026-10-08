import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";

import type { Store, StorePutInput } from "./store.interface.js";

export interface CloudinaryStoreConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class CloudinaryStore implements Store {
  constructor(config: CloudinaryStoreConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  async put(input: StorePutInput): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          public_id: input.objectKey,
          overwrite: false,
          invalidate: false,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);

            reject(
              new Error(
                `Cloudinary upload failed: ${error.message ?? "Unknown error"}`,
              ),
            );

            return;
          }

          if (!result) {
            reject(new Error("Cloudinary upload returned no result."));

            return;
          }

          resolve();
        },
      );

      input.stream.on("error", (error) => {
        uploadStream.destroy(error);
        reject(error);
      });

      uploadStream.on("error", (error) => {
        reject(error);
      });

      input.stream.pipe(uploadStream);
    });
  }

  async get(objectKey: string): Promise<Readable> {
    const url = cloudinary.url(objectKey, {
      resource_type: "raw",
      secure: true,
    });

    const response = await fetch(url);

    if (!response.ok || !response.body) {
      throw new Error(
        `Cloudinary download failed with status ${response.status}.`,
      );
    }

    return Readable.fromWeb(response.body as any);
  }

  async delete(objectKey: string): Promise<void> {
    const result = await cloudinary.uploader.destroy(objectKey, {
      resource_type: "raw",
      invalidate: true,
    });

    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(
        `Cloudinary deletion failed for "${objectKey}": ${result.result}`,
      );
    }
  }

  async exists(objectKey: string): Promise<boolean> {
    try {
      await cloudinary.api.resource(objectKey, {
        resource_type: "raw",
      });

      return true;
    } catch (error: unknown) {
      if (this.isCloudinaryNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  private isCloudinaryNotFoundError(error: unknown): boolean {
    if (
      typeof error !== "object" ||
      error === null ||
      !("http_code" in error)
    ) {
      return false;
    }

    return error.http_code === 404;
  }
}
