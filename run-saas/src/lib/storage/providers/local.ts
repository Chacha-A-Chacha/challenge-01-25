/**
 * Local File System Storage Provider
 *
 * Stores files on the local file system.
 * Suitable for development and testing environments.
 * NOT recommended for production (no redundancy, lost on redeployment).
 */

import fs from 'fs/promises';
import path from 'path';
import {
  IStorageProvider,
  StorageResult,
  DeleteResult,
  UploadOptions,
  UrlOptions,
  StorageConfig,
} from '../types';

export class LocalStorageProvider implements IStorageProvider {
  readonly name = 'local' as const;
  private storagePath: string;
  private baseUrl: string;

  constructor(config: StorageConfig['local']) {
    if (!config) {
      throw new Error('Local storage configuration is required');
    }
    this.storagePath = config.storagePath;
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private generateKey(originalName: string, options: UploadOptions): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(originalName);
    const safeName = options.filename || `${options.category}_${randomId}_${timestamp}${ext}`;

    // Organize by category and date
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${options.category}/${year}/${month}/${safeName}`;
  }

  private getFullPath(key: string): string {
    return path.join(this.storagePath, key);
  }

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<StorageResult> {
    const key = this.generateKey(originalName, options);
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, file);

    // Write metadata file
    const metadata = {
      originalName,
      mimeType,
      size: file.length,
      userId: options.userId,
      category: options.category,
      uploadedAt: new Date().toISOString(),
      ...options.metadata,
    };
    await fs.writeFile(`${fullPath}.meta.json`, JSON.stringify(metadata, null, 2));

    return {
      url: `${this.baseUrl}/${key}`,
      key,
      provider: this.name,
      originalName,
      size: file.length,
      mimeType,
      uploadedAt: new Date(),
    };
  }

  async delete(key: string): Promise<DeleteResult> {
    try {
      const fullPath = this.getFullPath(key);

      // Delete file and metadata
      await fs.unlink(fullPath);
      await fs.unlink(`${fullPath}.meta.json`).catch(() => {}); // Ignore if metadata doesn't exist

      return { success: true, key };
    } catch (error) {
      return {
        success: false,
        key,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  }

  async getUrl(key: string, options?: UrlOptions): Promise<string> {
    // Local storage doesn't support signed URLs
    // Just return the public URL
    const url = `${this.baseUrl}/${key}`;

    if (options?.download) {
      return `${url}?download=true`;
    }

    return url;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFullPath(key));
      return true;
    } catch {
      return false;
    }
  }
}
