/**
 * Storage Factory
 *
 * Creates and manages storage provider instances based on configuration.
 * Implements singleton pattern to avoid creating multiple connections.
 */

import { IStorageProvider, StorageConfig, StorageProviderType } from "./types";
import { LocalStorageProvider } from "./providers/local";
import { S3StorageProvider } from "./providers/s3";
import { GCSStorageProvider } from "./providers/gcs";

// Singleton instances cache
const providerInstances = new Map<StorageProviderType, IStorageProvider>();

/**
 * Get storage configuration from environment variables
 */
export function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER ||
    "local") as StorageProviderType;

  const config: StorageConfig = {
    provider,
  };

  switch (provider) {
    case "local":
      config.local = {
        storagePath: process.env.LOCAL_STORAGE_PATH || "./uploads",
        baseUrl:
          process.env.LOCAL_STORAGE_BASE_URL ||
          "http://localhost:3000/api/storage",
      };
      break;

    case "s3":
      if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        !process.env.AWS_S3_BUCKET
      ) {
        throw new Error(
          "Missing required S3 environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET",
        );
      }
      config.s3 = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_S3_REGION || "us-east-1",
        endpoint: process.env.AWS_S3_ENDPOINT,
      };
      break;

    case "gcs":
      if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET) {
        throw new Error(
          "Missing required GCS environment variables: GCS_PROJECT_ID, GCS_BUCKET",
        );
      }
      config.gcs = {
        projectId: process.env.GCS_PROJECT_ID,
        bucket: process.env.GCS_BUCKET,
        keyFilePath: process.env.GCS_KEY_FILE,
      };
      break;

    case "azure":
      if (
        !process.env.AZURE_STORAGE_CONNECTION_STRING ||
        !process.env.AZURE_CONTAINER_NAME
      ) {
        throw new Error(
          "Missing required Azure environment variables: AZURE_STORAGE_CONNECTION_STRING, AZURE_CONTAINER_NAME",
        );
      }
      config.azure = {
        connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
        containerName: process.env.AZURE_CONTAINER_NAME,
      };
      break;

    case "cloudinary":
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        throw new Error(
          "Missing required Cloudinary environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
        );
      }
      config.cloudinary = {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        folder: process.env.CLOUDINARY_FOLDER,
      };
      break;

    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }

  return config;
}

/**
 * Create a storage provider instance
 */
export function createStorageProvider(config: StorageConfig): IStorageProvider {
  // Check cache first
  const cached = providerInstances.get(config.provider);
  if (cached) {
    return cached;
  }

  let provider: IStorageProvider;

  switch (config.provider) {
    case "local":
      provider = new LocalStorageProvider(config.local);
      break;

    case "s3":
      provider = new S3StorageProvider(config.s3);
      break;

    case "gcs":
      provider = new GCSStorageProvider(config.gcs);
      break;

    case "azure":
      throw new Error(
        "Azure provider not yet implemented. Run: npm install @azure/storage-blob",
      );

    case "cloudinary":
      throw new Error(
        "Cloudinary provider not yet implemented. Run: npm install cloudinary",
      );

    default:
      throw new Error(`Unknown storage provider: ${config.provider}`);
  }

  // Cache the instance
  providerInstances.set(config.provider, provider);

  return provider;
}

/**
 * Get the default storage provider based on environment configuration
 */
export function getStorageProvider(): IStorageProvider {
  const config = getStorageConfig();
  return createStorageProvider(config);
}

/**
 * Clear the provider cache (useful for testing)
 */
export function clearProviderCache(): void {
  providerInstances.clear();
}
