import { env } from "../../config/env.js";
import { CloudinaryStore } from "./cloudinary.store.js";
import type { Store } from "./store.interface.js";

type StoreProvider = "cloudinary" | "s3";

function getStoreProvider(): StoreProvider {
  const provider = env.STORE_PROVIDER;

  if (!provider) {
    throw new Error("STORE_PROVIDER is not configured.");
  }

  if (provider !== "cloudinary" && provider !== "s3") {
    throw new Error(
      `Unsupported STORE_PROVIDER "${provider}". Expected "cloudinary" or "s3".`,
    );
  }

  return provider;
}

function createCloudinaryStore(): Store {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration is incomplete. " +
        "Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    );
  }

  return new CloudinaryStore({
    cloudName,
    apiKey,
    apiSecret,
  });
}

export function createStore(): Store {
  const provider = getStoreProvider();

  switch (provider) {
    case "cloudinary":
      return createCloudinaryStore();

    case "s3":
      throw new Error(
        "S3 storage is not implemented yet. Use STORE_PROVIDER=cloudinary.",
      );
  }
}
