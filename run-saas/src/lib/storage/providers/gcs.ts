/**
 * Google Cloud Storage Provider
 *
 * Stores files on Google Cloud Storage.
 * Good alternative to S3 with strong integration with GCP services.
 */

import {
  IStorageProvider,
  StorageResult,
  DeleteResult,
  UploadOptions,
  UrlOptions,
  StorageConfig,
} from '../types';

// Dynamic import for GCS SDK to avoid bundling if not used
let Storage: typeof import('@google-cloud/storage').Storage;

export class GCSStorageProvider implements IStorageProvider {
  readonly name = 'gcs' as const;
  private storage: InstanceType<typeof Storage> | null = null;
  private bucketName: string;
  private initialized = false;

  constructor(private config: StorageConfig['gcs']) {
    if (!config) {
      throw new Error('GCS storage configuration is required');
    }
    this.bucketName = config.bucket;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const gcsModule = await import('@google-cloud/storage');
      Storage = gcsModule.Storage;

      const storageOptions: ConstructorParameters<typeof Storage>[0] = {
        projectId: this.config!.projectId,
      };

      if (this.config!.keyFilePath) {
        storageOptions.keyFilename = this.config!.keyFilePath;
      } else if (this.config!.credentials) {
        storageOptions.credentials = this.config!.credentials as import('@google-cloud/storage').StorageOptions['credentials'];
      }

      this.storage = new Storage(storageOptions);
      this.initialized = true;
    } catch (error) {
      throw new Error(
        'Google Cloud Storage SDK not installed. Run: npm install @google-cloud/storage'
      );
    }
  }

  private get bucket() {
    return this.storage!.bucket(this.bucketName);
  }

  private generateKey(originalName: string, options: UploadOptions): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const ext = originalName.split('.').pop() || '';
    const safeName = options.filename || `${options.category}_${randomId}_${timestamp}.${ext}`;

    // Organize by category and date
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${options.category}/${year}/${month}/${safeName}`;
  }

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<StorageResult> {
    await this.ensureInitialized();

    const key = this.generateKey(originalName, options);
    const blob = this.bucket.file(key);

    await blob.save(file, {
      contentType: mimeType,
      metadata: {
        originalName,
        userId: options.userId,
        category: options.category,
        ...options.metadata,
      },
    });

    const url = `https://storage.googleapis.com/${this.bucketName}/${key}`;

    return {
      url,
      key,
      provider: this.name,
      originalName,
      size: file.length,
      mimeType,
      uploadedAt: new Date(),
    };
  }

  async delete(key: string): Promise<DeleteResult> {
    await this.ensureInitialized();

    try {
      await this.bucket.file(key).delete();

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
    await this.ensureInitialized();

    const expiresIn = options?.expiresIn || 3600; // Default 1 hour
    const expires = Date.now() + expiresIn * 1000;

    const [signedUrl] = await this.bucket.file(key).getSignedUrl({
      action: 'read',
      expires,
      responseDisposition: options?.download
        ? `attachment; filename="${key.split('/').pop()}"`
        : undefined,
    });

    return signedUrl;
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const [exists] = await this.bucket.file(key).exists();
      return exists;
    } catch {
      return false;
    }
  }
}
