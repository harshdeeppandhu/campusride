import { env } from '../../config/env.js';
import type { StorageProvider } from './interface.js';
import { consoleStorageAdapter } from './console.js';
import { R2StorageAdapter } from './r2.js';

let defaultStorageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (defaultStorageProvider) {
    return defaultStorageProvider;
  }

  switch (env.STORAGE_ADAPTER) {
    case 'r2':
      defaultStorageProvider = new R2StorageAdapter();
      break;
    case 'console':
    default:
      defaultStorageProvider = consoleStorageAdapter;
      break;
  }

  return defaultStorageProvider;
}

export { type StorageProvider, type PresignedUploadResult } from './interface.js';
export { consoleStorageAdapter } from './console.js';
export { R2StorageAdapter } from './r2.js';
