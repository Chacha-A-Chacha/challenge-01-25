/**
 * Storage Abstraction Layer - Type Definitions
 *
 * Provides a unified interface for file storage operations
 * independent of the underlying storage provider.
 */

export type StorageProviderType =
  | "local"
  | "s3"
  | "gcs"
  | "azure"
  | "cloudinary";

export type FileCategory = "receipt" | "photo" | "document";

export interface UploadOptions {
  /** File category for organizing storage */
  category: FileCategory;
  /** User ID for access control and path organization */
  userId: string;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Custom filename (optional, will generate if not provided) */
  filename?: string;
  /** Additional metadata to store */
  metadata?: Record<string, string>;
}

export interface StorageResult {
  /** Public URL to access the file */
  url: string;
  /** Unique storage key/path for the file */
  key: string;
  /** Provider that stored the file */
  provider: StorageProviderType;
  /** Original filename */
  originalName: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Upload timestamp */
  uploadedAt: Date;
}

export interface DeleteResult {
  success: boolean;
  key: string;
  error?: string;
}

export interface UrlOptions {
  /** URL expiration time in seconds (for signed URLs) */
  expiresIn?: number;
  /** Force download instead of inline display */
  download?: boolean;
}

export interface IStorageProvider {
  /** Provider identifier */
  readonly name: StorageProviderType;

  /**
   * Upload a file to storage
   * @param file - File buffer or stream
   * @param options - Upload options
   * @returns Storage result with URL and metadata
   */
  upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions,
  ): Promise<StorageResult>;

  /**
   * Delete a file from storage
   * @param key - Storage key of the file
   * @returns Delete result
   */
  delete(key: string): Promise<DeleteResult>;

  /**
   * Get URL for accessing a file
   * @param key - Storage key of the file
   * @param options - URL generation options
   * @returns Accessible URL
   */
  getUrl(key: string, options?: UrlOptions): Promise<string>;

  /**
   * Check if a file exists in storage
   * @param key - Storage key of the file
   * @returns True if file exists
   */
  exists(key: string): Promise<boolean>;
}

export interface StorageConfig {
  provider: StorageProviderType;

  // Local storage config
  local?: {
    storagePath: string;
    baseUrl: string;
  };

  // AWS S3 config
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
    endpoint?: string; // For S3-compatible services
  };

  // Google Cloud Storage config
  gcs?: {
    projectId: string;
    bucket: string;
    keyFilePath?: string;
    credentials?: object;
  };

  // Azure Blob Storage config
  azure?: {
    connectionString: string;
    containerName: string;
  };

  // Cloudinary config
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    folder?: string;
  };
}

// Default file constraints
export const FILE_CONSTRAINTS: Record<
  FileCategory,
  { allowedTypes: string[]; maxSize: number }
> = {
  receipt: {
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  photo: {
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 2 * 1024 * 1024, // 2MB
  },
  document: {
    allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
};
