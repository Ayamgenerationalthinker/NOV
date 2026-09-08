import { IStorageService } from './storage.interface';
import { S3StorageAdapter } from './s3.storage';
import { LocalStorageAdapter } from './local.storage';
import { env } from '@/lib/env';

class StorageServiceFactory {
  private instance: IStorageService | null = null;
  private localAdapter: LocalStorageAdapter | null = null;

  getService(): IStorageService {
    if (this.instance) {
      return this.instance;
    }

    const hasR2Credentials =
      Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) ||
      Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

    if (hasR2Credentials) {
      this.instance = new S3StorageAdapter();
    } else {
      this.localAdapter = new LocalStorageAdapter();
      this.instance = this.localAdapter;
    }

    return this.instance;
  }

  getLocalAdapter(): LocalStorageAdapter {
    if (!this.localAdapter) {
      this.localAdapter = new LocalStorageAdapter();
    }
    return this.localAdapter;
  }
}

export const storageService = new StorageServiceFactory().getService();
export const localStorageAdapter = new StorageServiceFactory().getLocalAdapter();
