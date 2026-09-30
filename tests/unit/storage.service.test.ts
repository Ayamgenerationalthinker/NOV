import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageAdapter } from '@/services/storage/local.storage';
import fs from 'fs';
import path from 'path';
import { verifyDownloadSignature } from '@/lib/signed-download';
import { resolveStorageBackend } from '@/services/storage/storage.service';
import { isMediaKey, isProductFileKey } from '@/lib/upload-rules';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  const testKey = 'test-products/sample-asset.pdf';
  const testContent = Buffer.from('Test digital file binary content');

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  afterEach(async () => {
    try {
      await adapter.deleteFile(testKey);
    } catch {
      // Ignore
    }
  });

  it('should upload a private file and write metadata sidecar', async () => {
    const result = await adapter.uploadFile({
      fileBuffer: testContent,
      key: testKey,
      contentType: 'application/pdf',
    });

    expect(result.key).toBe(testKey);
    expect(result.size).toBe(testContent.length);
    expect(result.contentType).toBe('application/pdf');

    const filePath = path.join(process.cwd(), '.private_storage', testKey);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath).toString()).toBe(testContent.toString());
  });

  it('should generate a signed temporary download URL with HMAC signature', async () => {
    const url = await adapter.getSignedDownloadUrl({
      key: testKey,
      expiresInSeconds: 900,
      originalFileName: 'nov-guide.pdf',
    });

    expect(url).toContain('/api/downloads/file-stream');
    expect(url).toContain('key=test-products%2Fsample-asset.pdf');
    expect(url).toContain('expires=');
    expect(url).toContain('sig=');
    expect(url).toContain('fn=nov-guide.pdf');
  });

  it('signed download links verify, and reject tampered keys, bad signatures and expired links', async () => {
    const url = new URL(await adapter.getSignedDownloadUrl({ key: 'products/p1/book.pdf', expiresInSeconds: 600 }));
    const key = url.searchParams.get('key')!;
    const expires = Number(url.searchParams.get('expires'));
    const sig = url.searchParams.get('sig')!;

    expect(verifyDownloadSignature(key, expires, sig)).toBe(true);
    expect(verifyDownloadSignature('products/p2/other.pdf', expires, sig)).toBe(false);
    expect(verifyDownloadSignature(key, expires + 1, sig)).toBe(false);
    expect(verifyDownloadSignature(key, expires, 'abc')).toBe(false);
    expect(verifyDownloadSignature(key, Math.floor(Date.now() / 1000) - 10, sig)).toBe(false);
  });
});

describe('Storage selection', () => {
  it('prefers Vercel Blob, then R2/S3, then local disk only outside production', () => {
    expect(resolveStorageBackend({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_x', NODE_ENV: 'production' } as any)).toBe('vercel-blob');
    expect(resolveStorageBackend({ R2_ACCESS_KEY_ID: 'a', R2_SECRET_ACCESS_KEY: 'b', NODE_ENV: 'production' } as any)).toBe('s3');
    expect(resolveStorageBackend({ NODE_ENV: 'development' } as any)).toBe('local');
    // Never write uploads to Vercel's temporary disk
    expect(resolveStorageBackend({ NODE_ENV: 'production' } as any)).toBe('none');
    expect(resolveStorageBackend({ NODE_ENV: 'development', VERCEL: '1' } as any)).toBe('none');
  });

  it('only product images (media/) are publicly viewable; paid files stay under products/<id>/', () => {
    expect(isMediaKey('media/products/cover-abc.png')).toBe(true);
    expect(isMediaKey('products/p1/book.pdf')).toBe(false);
    expect(isMediaKey('media/../products/p1/book.pdf')).toBe(false);
    expect(isProductFileKey('products/p1/abc-book.pdf', 'p1')).toBe(true);
    expect(isProductFileKey('products/p2/abc-book.pdf', 'p1')).toBe(false);
    expect(isProductFileKey('products/p1/../p2/x.pdf', 'p1')).toBe(false);
  });
});
