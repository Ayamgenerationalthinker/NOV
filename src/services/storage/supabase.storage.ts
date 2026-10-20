import { Readable } from 'stream';
import type { ReadableStream as NodeWebReadableStream } from 'stream/web';
import {
  IStorageService,
  UploadFileParams,
  UploadFileResult,
  SignedUrlParams,
  FileStreamResult,
} from './storage.interface';

export interface SupabaseStorageConfig {
  url: string;
  serviceKey: string;
  bucket: string;
}

export const DEFAULT_SUPABASE_BUCKET = 'tomevari';

/** Env values pasted into dashboards often carry stray spaces or quotes: ignore them. */
function clean(value: string | undefined): string {
  return (value ?? '').trim().replace(/^(['"])(.*)\1$/, '$2');
}

/** Reads the Supabase project URL and secret key, under any of the names Supabase / Vercel use. */
export function supabaseStorageConfig(source: NodeJS.ProcessEnv = process.env): SupabaseStorageConfig | null {
  const url = clean(source.SUPABASE_URL) || clean(source.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = clean(source.SUPABASE_SERVICE_ROLE_KEY) || clean(source.SUPABASE_SECRET_KEY);
  if (!url || !serviceKey) return null;
  return {
    url: url.replace(/\/+$/, ''),
    serviceKey,
    bucket: clean(source.SUPABASE_STORAGE_BUCKET) || DEFAULT_SUPABASE_BUCKET,
  };
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/**
 * Supabase Storage (one private bucket, created automatically on first use). Nothing in the
 * bucket is publicly reachable: product images are served through /api/media and paid files
 * only through short-lived signed links. Uses the project's secret (service role) key, which
 * must never reach the browser.
 */
export class SupabaseStorageAdapter implements IStorageService {
  private readonly base: string;
  private bucketReady: Promise<void> | null = null;

  constructor(private readonly config: SupabaseStorageConfig) {
    this.base = `${config.url}/storage/v1`;
  }

  private request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.config.serviceKey}`);
    headers.set('apikey', this.config.serviceKey);
    return fetch(`${this.base}${path}`, { ...init, headers, cache: 'no-store' });
  }

  private objectPath(key: string): string {
    return `${this.config.bucket}/${encodeKey(key)}`;
  }

  private async errorMessage(res: Response): Promise<string> {
    try {
      const data = await res.clone().json();
      return data.message || data.error || `Supabase Storage error (${res.status})`;
    } catch {
      return `Supabase Storage error (${res.status})`;
    }
  }

  private ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const res = await this.request('/bucket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: this.config.bucket, name: this.config.bucket, public: false }),
        });
        if (res.ok) return;
        const message = await this.errorMessage(res);
        if (res.status === 409 || /already exists|duplicate/i.test(message)) return;
        throw new Error(`Could not create the "${this.config.bucket}" storage bucket: ${message}`);
      })().catch((error) => {
        this.bucketReady = null;
        throw error;
      });
    }
    return this.bucketReady;
  }

  /** Runs a write; if the bucket does not exist yet, creates it and tries once more. */
  private async withBucket(send: () => Promise<Response>): Promise<Response> {
    const res = await send();
    if (res.ok) return res;
    const message = await this.errorMessage(res);
    if (/bucket not found/i.test(message)) {
      await this.ensureBucket();
      return send();
    }
    return res;
  }

  async uploadFile({ fileBuffer, key, contentType }: UploadFileParams): Promise<UploadFileResult> {
    const res = await this.withBucket(() =>
      this.request(`/object/${this.objectPath(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': contentType || 'application/octet-stream', 'x-upsert': 'true' },
        body: new Uint8Array(fileBuffer),
      })
    );
    if (!res.ok) throw new Error(await this.errorMessage(res));
    return { key, size: fileBuffer.length, contentType };
  }

  /** A one-time URL the owner's browser can PUT a file to, so big files skip our server. */
  async createSignedUploadUrl(key: string): Promise<string> {
    const res = await this.withBucket(() =>
      this.request(`/object/upload/sign/${this.objectPath(key)}`, { method: 'POST' })
    );
    if (!res.ok) throw new Error(await this.errorMessage(res));
    const data = await res.json();
    if (typeof data.url !== 'string') throw new Error('Supabase did not return an upload link.');
    return `${this.base}${data.url}`;
  }

  async getSignedDownloadUrl({ key, expiresInSeconds = 900, originalFileName, inline }: SignedUrlParams): Promise<string> {
    const res = await this.request(`/object/sign/${this.objectPath(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!res.ok) throw new Error(await this.errorMessage(res));
    const data = await res.json();
    const signedPath: unknown = data.signedURL ?? data.signedUrl;
    if (typeof signedPath !== 'string') throw new Error('Supabase did not return a download link.');
    const url = new URL(`${this.base}${signedPath}`);
    // "download" makes the browser save the file under its original name instead of opening it.
    if (!inline) url.searchParams.set('download', originalFileName || '');
    return url.toString();
  }

  async deleteFile(key: string): Promise<void> {
    const res = await this.request(`/object/${this.objectPath(key)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      const message = await this.errorMessage(res);
      if (!/not found/i.test(message)) throw new Error(message);
    }
  }

  async getFileStream(key: string): Promise<FileStreamResult> {
    const res = await this.request(`/object/${this.objectPath(key)}`);
    if (!res.ok || !res.body) {
      throw new Error(`File not found in Supabase storage: ${key}`);
    }
    const length = Number(res.headers.get('content-length'));
    return {
      stream: Readable.fromWeb(res.body as unknown as NodeWebReadableStream),
      contentType: res.headers.get('content-type') || 'application/octet-stream',
      contentLength: Number.isFinite(length) && length > 0 ? length : undefined,
    };
  }

  async statFile(key: string): Promise<{ size: number; contentType: string } | null> {
    const res = await this.request(`/object/info/${this.objectPath(key)}`);
    if (!res.ok) {
      const message = await this.errorMessage(res);
      if (res.status === 404 || res.status === 400 || /not found/i.test(message)) return null;
      throw new Error(message);
    }
    const info = await res.json();
    const size = Number(info.size ?? info.metadata?.size ?? info.metadata?.contentLength);
    if (!Number.isFinite(size)) return null;
    return {
      size,
      contentType:
        info.content_type || info.contentType || info.metadata?.mimetype || 'application/octet-stream',
    };
  }
}
