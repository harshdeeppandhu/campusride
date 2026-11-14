import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { StorageProvider, PresignedUploadResult } from './interface.js';

export class ConsoleStorageAdapter implements StorageProvider {
  public readonly name = 'console';
  private storedKeys = new Set<string>();

  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<PresignedUploadResult> {
    const uploadUrl = `${env.API_BASE_URL}/api/v1/mock-storage/upload/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;
    this.storedKeys.add(key);

    logger.info(
      { key, contentType, expiresInSeconds, uploadUrl },
      `[DEV STORAGE] Generated presigned upload URL for key: ${key}`,
    );

    return Promise.resolve({
      uploadUrl,
      key,
      expiresInSeconds,
    });
  }

  getPresignedDownloadUrl(key: string, expiresInSeconds = 60): Promise<string> {
    const downloadUrl = `${env.API_BASE_URL}/api/v1/mock-storage/download/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;

    logger.info(
      { key, expiresInSeconds, downloadUrl },
      `[DEV STORAGE] Generated 60-second presigned download URL for key: ${key}`,
    );

    return Promise.resolve(downloadUrl);
  }

  delete(key: string): Promise<void> {
    this.storedKeys.delete(key);
    logger.info({ key }, `[DEV STORAGE] Deleted storage key: ${key}`);
    return Promise.resolve();
  }

  exists(key: string): Promise<boolean> {
    return Promise.resolve(this.storedKeys.has(key));
  }

  clear(): void {
    this.storedKeys.clear();
  }
}

export const consoleStorageAdapter = new ConsoleStorageAdapter();
