/**
 * AWS S3 Storage Provider
 *
 * Stores files on AWS S3 or S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
 * Recommended for production use.
 */

import {
  IStorageProvider,
  StorageResult,
  DeleteResult,
  UploadOptions,
  UrlOptions,
  StorageConfig,
} from '../types';

// Dynamic import for AWS SDK to avoid bundling if not used
let S3Client: typeof import('@aws-sdk/client-s3').S3Client;
let PutObjectCommand: typeof import('@aws-sdk/client-s3').PutObjectCommand;
let DeleteObjectCommand: typeof import('@aws-sdk/client-s3').DeleteObjectCommand;
let HeadObjectCommand: typeof import('@aws-sdk/client-s3').HeadObjectCommand;
let GetObjectCommand: typeof import('@aws-sdk/client-s3').GetObjectCommand;
let getSignedUrl: typeof import('@aws-sdk/s3-request-presigner').getSignedUrl;

export class S3StorageProvider implements IStorageProvider {
  readonly name = 's3' as const;
  private client: InstanceType<typeof S3Client> | null = null;
  private bucket: string;
  private region: string;
  private endpoint?: string;
  private initialized = false;

  constructor(private config: StorageConfig['s3']) {
    if (!config) {
      throw new Error('S3 storage configuration is required');
    }
    this.bucket = config.bucket;
    this.region = config.region;
    this.endpoint = config.endpoint;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      const s3Module = await import('@aws-sdk/client-s3');
      const presignerModule = await import('@aws-sdk/s3-request-presigner');

      S3Client = s3Module.S3Client;
      PutObjectCommand = s3Module.PutObjectCommand;
      DeleteObjectCommand = s3Module.DeleteObjectCommand;
      HeadObjectCommand = s3Module.HeadObjectCommand;
      GetObjectCommand = s3Module.GetObjectCommand;
      getSignedUrl = presignerModule.getSignedUrl;

      this.client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: this.config!.accessKeyId,
          secretAccessKey: this.config!.secretAccessKey,
        },
      });

      this.initialized = true;
    } catch (error) {
      throw new Error(
        'AWS SDK not installed. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner'
      );
    }
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

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimeType,
      Metadata: {
        originalName,
        userId: options.userId,
        category: options.category,
        ...options.metadata,
      },
    });

    await this.client!.send(command);

    // Generate URL
    const url = this.endpoint
      ? `${this.endpoint}/${this.bucket}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

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
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client!.send(command);

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

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: options?.download
        ? `attachment; filename="${key.split('/').pop()}"`
        : undefined,
    });

    return getSignedUrl(this.client!, command, { expiresIn });
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client!.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
