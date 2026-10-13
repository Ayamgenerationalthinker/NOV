import { IStorageService } from './storage.interface';
import { S3StorageAdapter } from './s3.storage';
import { LocalStorageAdapter } from './local.storage';
import { VercelBlobStorageAdapter } from './vercel-blob.storage';
import { SupabaseStorageAdapter, supabaseStorageConfig } from './supabase.storage';
import { env } from '@/lib/env';

export type StorageBackend = 'vercel-blob' | 'supabase' | 's3' | 'local' | 'none';

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      'File storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API) to the environment variables, then redeploy.'
    );
    this.name = 'StorageNotConfiguredError';
  }
}

/** Which storage the app will use: Vercel Blob, then Supabase, then R2/S3, then local disk (development only). */
export function resolveStorageBackend(source: NodeJS.ProcessEnv = process.env): StorageBackend {
  if (source.BLOB_READ_WRITE_TOKEN) return 'vercel-blob';
  if (supabaseStorageConfig(source)) return 'supabase';
  if ((source.R2_ACCESS_KEY_ID && source.R2_SECRET_ACCESS_KEY) || (source.AWS_ACCESS_KEY_ID && source.AWS_SECRET_ACCESS_KEY)) return 's3';
  // Vercel's filesystem is read-only/ephemeral: never silently write uploads there.
  if (source.NODE_ENV === 'production' || source.VERCEL) return 'none';
  return 'local';
}

class UnconfiguredStorage implements IStorageService {
  async uploadFile(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async getSignedDownloadUrl(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async deleteFile(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
  async getFileStream(): Promise<never> {
    throw new StorageNotConfiguredError();
  }
}

function createStorage(backend: StorageBackend): IStorageService {
  switch (backend) {
    case 'vercel-blob':
      return new VercelBlobStorageAdapter();
    case 'supabase':
      return new SupabaseStorageAdapter(supabaseStorageConfig()!);
    case 's3':
      return new S3StorageAdapter();
    case 'local':
      return new LocalStorageAdapter();
    default:
      return new UnconfiguredStorage();
  }
}

export const storageBackend = resolveStorageBackend();
export const storageService: IStorageService = createStorage(storageBackend);

// Keep env imported so misconfiguration errors surface at startup, not on first upload.
void env;
