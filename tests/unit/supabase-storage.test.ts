import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import { SupabaseStorageAdapter, supabaseStorageConfig } from '@/services/storage/supabase.storage';
import { resolveStorageBackend } from '@/services/storage/storage.service';
import { pgConnectionString } from '@/lib/pg-config';
import { loadEnv } from '@/lib/env';

const config = { url: 'https://abc.supabase.co', serviceKey: 'secret-key', bucket: 'tomevari' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Supabase storage', () => {
  const fetchMock = vi.fn();
  let adapter: SupabaseStorageAdapter;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    adapter = new SupabaseStorageAdapter(config);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is selected when the project URL and secret key are set, under either naming', () => {
    expect(resolveStorageBackend({ SUPABASE_URL: config.url, SUPABASE_SERVICE_ROLE_KEY: 'k', NODE_ENV: 'production' } as any)).toBe('supabase');
    expect(resolveStorageBackend({ NEXT_PUBLIC_SUPABASE_URL: config.url, SUPABASE_SECRET_KEY: 'k', VERCEL: '1' } as any)).toBe('supabase');
    // The public (anon) key alone is not enough to store files
    expect(resolveStorageBackend({ SUPABASE_URL: config.url, SUPABASE_ANON_KEY: 'k', NODE_ENV: 'production' } as any)).toBe('none');
    expect(supabaseStorageConfig({ SUPABASE_URL: ' "https://abc.supabase.co/" ', SUPABASE_SERVICE_ROLE_KEY: ' k ' } as any)).toEqual({
      url: 'https://abc.supabase.co',
      serviceKey: 'k',
      bucket: 'tomevari',
    });
  });

  it('uploads to the private bucket with the secret key', async () => {
    fetchMock.mockResolvedValue(json({ Key: 'tomevari/products/p1/book.pdf' }));
    const result = await adapter.uploadFile({ fileBuffer: Buffer.from('pdf'), key: 'products/p1/my book.pdf', contentType: 'application/pdf' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://abc.supabase.co/storage/v1/object/tomevari/products/p1/my%20book.pdf');
    expect(init.method).toBe('POST');
    expect(init.headers.get('Authorization')).toBe('Bearer secret-key');
    expect(init.headers.get('Content-Type')).toBe('application/pdf');
    expect(result).toEqual({ key: 'products/p1/my book.pdf', size: 3, contentType: 'application/pdf' });
  });

  it('creates the bucket on first use, then retries the upload', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' }, 400))
      .mockResolvedValueOnce(json({ name: 'tomevari' }))
      .mockResolvedValueOnce(json({ Key: 'tomevari/media/products/a.png' }));

    await adapter.uploadFile({ fileBuffer: Buffer.from('x'), key: 'media/products/a.png', contentType: 'image/png' });

    const [bucketUrl, bucketInit] = fetchMock.mock.calls[1];
    expect(bucketUrl).toBe('https://abc.supabase.co/storage/v1/bucket');
    expect(JSON.parse(bucketInit.body)).toEqual({ id: 'tomevari', name: 'tomevari', public: false });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('surfaces the storage error when an upload is refused', async () => {
    fetchMock.mockResolvedValue(json({ message: 'The object exceeded the maximum allowed size' }, 413));
    await expect(
      adapter.uploadFile({ fileBuffer: Buffer.from('x'), key: 'products/p1/big.pdf', contentType: 'application/pdf' })
    ).rejects.toThrow('maximum allowed size');
  });

  it('issues a one-time browser upload link without exposing the secret key', async () => {
    fetchMock.mockResolvedValue(json({ url: '/object/upload/sign/tomevari/products/p1/book.pdf?token=tok' }));
    const url = await adapter.createSignedUploadUrl('products/p1/book.pdf');
    expect(url).toBe('https://abc.supabase.co/storage/v1/object/upload/sign/tomevari/products/p1/book.pdf?token=tok');
    expect(url).not.toContain('secret-key');
  });

  it('gives buyers a short-lived download link that saves under the original name', async () => {
    fetchMock.mockResolvedValue(json({ signedURL: '/object/sign/tomevari/products/p1/book.pdf?token=tok' }));
    const url = new URL(await adapter.getSignedDownloadUrl({ key: 'products/p1/book.pdf', originalFileName: 'My Book.pdf', expiresInSeconds: 600 }));

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ expiresIn: 600 });
    expect(url.origin + url.pathname).toBe('https://abc.supabase.co/storage/v1/object/sign/tomevari/products/p1/book.pdf');
    expect(url.searchParams.get('token')).toBe('tok');
    expect(url.searchParams.get('download')).toBe('My Book.pdf');
  });

  it('streams a stored file, and reports missing files', async () => {
    fetchMock.mockResolvedValueOnce(new Response('hello', { headers: { 'Content-Type': 'image/png', 'Content-Length': '5' } }));
    const file = await adapter.getFileStream('media/products/a.png');
    expect(file.contentType).toBe('image/png');
    expect(file.contentLength).toBe(5);
    const chunks: Buffer[] = [];
    for await (const c of file.stream as Readable) chunks.push(Buffer.from(c));
    expect(Buffer.concat(chunks).toString()).toBe('hello');

    fetchMock.mockResolvedValueOnce(json({ message: 'Object not found' }, 400));
    await expect(adapter.getFileStream('media/products/missing.png')).rejects.toThrow('not found');
  });

  it('stat returns the real size, or null for a file that was never uploaded', async () => {
    fetchMock.mockResolvedValueOnce(json({ size: 1234, content_type: 'application/pdf' }));
    expect(await adapter.statFile('products/p1/book.pdf')).toEqual({ size: 1234, contentType: 'application/pdf' });

    fetchMock.mockResolvedValueOnce(json({ message: 'Object not found' }, 400));
    expect(await adapter.statFile('products/p1/nope.pdf')).toBeNull();
  });

  it('deleting a file that is already gone is not an error', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Object not found' }, 400));
    await expect(adapter.deleteFile('products/p1/gone.pdf')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});

describe('Supabase database connection', () => {
  it('accepts sslmode=require connection strings without failing on the certificate chain', () => {
    expect(pgConnectionString('postgresql://u:p@host:6543/postgres?sslmode=require')).toBe(
      'postgresql://u:p@host:6543/postgres?sslmode=require&uselibpqcompat=true'
    );
    expect(pgConnectionString('postgresql://u:p@localhost:5432/nov_dev?schema=public')).toBe(
      'postgresql://u:p@localhost:5432/nov_dev?schema=public'
    );
    const already = 'postgresql://u:p@host/db?sslmode=require&uselibpqcompat=true';
    expect(pgConnectionString(already)).toBe(already);
  });

  it('shows tomevari8@gmail.com unless another address is configured', () => {
    expect(loadEnv({ NODE_ENV: 'test' } as any).NEXT_PUBLIC_SUPPORT_EMAIL).toBe('tomevari8@gmail.com');
  });
});
