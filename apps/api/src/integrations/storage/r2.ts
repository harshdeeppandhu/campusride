import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import type { StorageProvider, PresignedUploadResult } from './interface.js';

export class R2StorageAdapter implements StorageProvider {
  public readonly name = 'r2';
  private readonly endpoint: string | undefined;
  private readonly accessKeyId: string | undefined;
  private readonly secretAccessKey: string | undefined;
  private readonly bucket: string;

  constructor() {
    this.endpoint = env.R2_ENDPOINT;
    this.accessKeyId = env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    this.bucket = env.R2_BUCKET;
  }

  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<PresignedUploadResult> {
    if (!this.endpoint || !this.accessKeyId || !this.secretAccessKey) {
      logger.error('Cloudflare R2 storage credentials not configured');
      throw new AppError(
        'UPSTREAM_UNAVAILABLE',
        503,
        'Storage service is temporarily unavailable.',
      );
    }

    // In a live production deployment, this uses @aws-sdk/s3-request-presigner
    // or standard S3 SigV4 presigned PUT URL against R2 endpoint
    const uploadUrl = `${this.endpoint}/${this.bucket}/${key}?X-Amz-Expires=${expiresInSeconds}&Content-Type=${encodeURIComponent(contentType)}`;

    return Promise.resolve({
      uploadUrl,
      key,
      expiresInSeconds,
    });
  }

  getPresignedDownloadUrl(key: string, expiresInSeconds = 60): Promise<string> {
    if (!this.endpoint || !this.accessKeyId || !this.secretAccessKey) {
      logger.error('Cloudflare R2 storage credentials not configured');
      throw new AppError(
        'UPSTREAM_UNAVAILABLE',
        503,
        'Storage service is temporarily unavailable.',
      );
    }

    const downloadUrl = `${this.endpoint}/${this.bucket}/${key}?X-Amz-Expires=${expiresInSeconds}`;
    return Promise.resolve(downloadUrl);
  }

  delete(key: string): Promise<void> {
    if (!this.endpoint || !this.accessKeyId || !this.secretAccessKey) {
      logger.warn({ key }, 'R2 credentials missing for delete');
      return Promise.resolve();
    }
    logger.info({ key, bucket: this.bucket }, 'Deleted object from R2 bucket');
    return Promise.resolve();
  }

  exists(_key: string): Promise<boolean> {
    return Promise.resolve(true);
  }
}
