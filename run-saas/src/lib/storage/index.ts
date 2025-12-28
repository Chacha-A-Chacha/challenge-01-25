/**
 * Storage Abstraction Layer
 *
 * Provides a unified interface for file storage operations
 * independent of the underlying storage provider.
 *
 * Usage:
 * ```typescript
 * import { storage, uploadFile, deleteFile, getFileUrl } from '@/lib/storage';
 *
 * // Upload a file
 * const result = await uploadFile(buffer, 'receipt.pdf', 'application/pdf', {
 *   category: 'receipt',
 *   userId: 'user123',
 * });
 *
 * // Get signed URL
 * const url = await getFileUrl(result.key);
 *
 * // Delete file
 * await deleteFile(result.key);
 * ```
 *
 * Configuration via environment variables:
 * - STORAGE_PROVIDER: 'local' | 's3' | 'gcs' | 'azure' | 'cloudinary'
 * - Provider-specific variables (see .env.example)
 */

export * from './types';
export * from './factory';

import { getStorageProvider } from './factory';
import {
  IStorageProvider,
  StorageResult,
  DeleteResult,
  UploadOptions,
  UrlOptions,
  FILE_CONSTRAINTS,
  FileCategory,
} from './types';

/**
 * Get the configured storage provider instance
 */
export function storage(): IStorageProvider {
  return getStorageProvider();
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: Buffer,
  mimeType: string,
  category: FileCategory
): { valid: boolean; error?: string } {
  const constraints = FILE_CONSTRAINTS[category];

  if (!constraints.allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${constraints.allowedTypes.join(', ')}`,
    };
  }

  if (file.length > constraints.maxSize) {
    const maxSizeMB = constraints.maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload a file with validation
 */
export async function uploadFile(
  file: Buffer,
  originalName: string,
  mimeType: string,
  options: UploadOptions
): Promise<StorageResult> {
  // Validate file
  const validation = validateFile(file, mimeType, options.category);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Upload using configured provider
  const provider = getStorageProvider();
  return provider.upload(file, originalName, mimeType, options);
}

/**
 * Delete a file
 */
export async function deleteFile(key: string): Promise<DeleteResult> {
  const provider = getStorageProvider();
  return provider.delete(key);
}

/**
 * Get URL for accessing a file
 */
export async function getFileUrl(key: string, options?: UrlOptions): Promise<string> {
  const provider = getStorageProvider();
  return provider.getUrl(key, options);
}

/**
 * Check if a file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  const provider = getStorageProvider();
  return provider.exists(key);
}
