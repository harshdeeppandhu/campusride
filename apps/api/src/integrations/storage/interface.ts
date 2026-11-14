export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

export interface StorageProvider {
  name: string;
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<PresignedUploadResult>;
  getPresignedDownloadUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
