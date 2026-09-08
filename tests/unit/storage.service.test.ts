import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageAdapter } from '@/services/storage/local.storage';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

  it('should verify local HMAC signature correctly and reject expired or tampered signatures', () => {
    const expires = Math.floor(Date.now() / 1000) + 600;
    const key = 'test/key.zip';
    const secret = process.env.AUTH_SECRET || 'dev-auth-secret-for-local-testing-32-chars-long';
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${key}:${expires}:${secret}`)
      .digest('hex');

    // Valid signature
    expect(adapter.verifyLocalSignature(key, expires, validSig)).toBe(true);

    // Tampered key
    expect(adapter.verifyLocalSignature('tampered/key.zip', expires, validSig)).toBe(false);

    // Expired timestamp
    const pastExpires = Math.floor(Date.now() / 1000) - 10;
    expect(adapter.verifyLocalSignature(key, pastExpires, validSig)).toBe(false);
  });
});
