import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import { put, get, del, head, BlobNotFoundError } from '@vercel/blob';
import { VercelBlobStorageAdapter } from '@/services/storage/vercel-blob.storage';
import { loadEnv, vercelSiteUrl } from '@/lib/env';
import { prisma } from '@/lib/prisma';

vi.mock('@vercel/blob', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vercel/blob')>();
  return { ...actual, put: vi.fn(), get: vi.fn(), del: vi.fn(), head: vi.fn() };
});

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findUnique: vi.fn() },
    productFile: { updateMany: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

describe('Vercel Blob storage (private)', () => {
  const adapter = new VercelBlobStorageAdapter();

  beforeEach(() => vi.clearAllMocks());

  it('uploads privately under the exact key', async () => {
    vi.mocked(put).mockResolvedValue({ pathname: 'products/p1/book.pdf' } as any);
    const result = await adapter.uploadFile({ fileBuffer: Buffer.from('pdf'), key: 'products/p1/book.pdf', contentType: 'application/pdf' });

    expect(put).toHaveBeenCalledWith('products/p1/book.pdf', expect.any(Buffer), expect.objectContaining({ access: 'private', addRandomSuffix: false }));
    expect(result).toEqual({ key: 'products/p1/book.pdf', size: 3, contentType: 'application/pdf' });
  });

  it('never hands out the raw blob URL: downloads use short-lived signed app links', async () => {
    const url = await adapter.getSignedDownloadUrl({ key: 'products/p1/book.pdf', originalFileName: 'Book.pdf' });
    expect(url).toContain('/api/downloads/file-stream?');
    expect(url).not.toContain('blob.vercel-storage.com');
  });

  it('streams a private blob, and reports missing files', async () => {
    vi.mocked(get).mockResolvedValue({
      statusCode: 200,
      stream: new Response('hello').body,
      headers: new Headers(),
      blob: { contentType: 'application/pdf', size: 5 },
    } as any);
    const file = await adapter.getFileStream('products/p1/book.pdf');
    expect(get).toHaveBeenCalledWith('products/p1/book.pdf', { access: 'private' });
    expect(file.contentType).toBe('application/pdf');
    const chunks: Buffer[] = [];
    for await (const c of file.stream as Readable) chunks.push(Buffer.from(c));
    expect(Buffer.concat(chunks).toString()).toBe('hello');

    vi.mocked(get).mockResolvedValue(null);
    await expect(adapter.getFileStream('products/p1/missing.pdf')).rejects.toThrow('not found');
  });

  it('stat returns null for a file that was never uploaded', async () => {
    vi.mocked(head).mockRejectedValue(new BlobNotFoundError());
    expect(await adapter.statFile('products/p1/nope.pdf')).toBeNull();
    vi.mocked(head).mockResolvedValue({ size: 1234, contentType: 'application/pdf' } as any);
    expect(await adapter.statFile('products/p1/book.pdf')).toEqual({ size: 1234, contentType: 'application/pdf' });
  });

  it('deletes by key', async () => {
    await adapter.deleteFile('products/p1/book.pdf');
    expect(del).toHaveBeenCalledWith('products/p1/book.pdf');
  });
});

describe('Registering a file the browser uploaded directly', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function service() {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test');
    const mod = await import('@/services/file/product-file.service');
    vi.unstubAllEnvs();
    return mod.ProductFileService;
  }

  it('records the real size from storage, not what the browser claims', async () => {
    const ProductFileService = await service();
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1' } as any);
    vi.mocked(head).mockResolvedValue({ size: 52_428_800, contentType: 'application/pdf' } as any);
    vi.mocked(prisma.productFile.create).mockImplementation(((args: any) => Promise.resolve({ id: 'f1', ...args.data })) as any);

    const file = await ProductFileService.registerUploadedFile({
      productId: 'p1',
      fileKey: 'products/p1/big-book-abc123.pdf',
      fileName: 'Big Book.pdf',
      adminUserId: 'owner',
    });

    expect(file.fileSize).toBe(52_428_800);
    expect(prisma.productFile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ productId: 'p1', fileKey: 'products/p1/big-book-abc123.pdf', fileName: 'Big Book.pdf' }),
    });
  });

  it("refuses another product's file or a file that doesn't exist", async () => {
    const ProductFileService = await service();
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1' } as any);

    await expect(
      ProductFileService.registerUploadedFile({ productId: 'p1', fileKey: 'products/p2/x.pdf', fileName: 'x.pdf', adminUserId: 'o' })
    ).rejects.toThrow('does not belong');

    vi.mocked(head).mockRejectedValue(new BlobNotFoundError());
    await expect(
      ProductFileService.registerUploadedFile({ productId: 'p1', fileKey: 'products/p1/ghost.pdf', fileName: 'g.pdf', adminUserId: 'o' })
    ).rejects.toThrow('could not be found');
  });
});

describe('Vercel environment', () => {
  it('uses the Vercel production domain for share links when NEXT_PUBLIC_APP_URL is not set', () => {
    expect(vercelSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'nov.vercel.app' } as any)).toBe('https://nov.vercel.app');
    const parsed = loadEnv({
      NODE_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'nov.vercel.app',
      DATABASE_URL: 'postgresql://x',
      AUTH_SECRET: 'a'.repeat(40),
    } as any);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('https://nov.vercel.app');
  });

  it('an explicit NEXT_PUBLIC_APP_URL (custom domain) wins', () => {
    const parsed = loadEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://shop.example.com',
      VERCEL_PROJECT_PRODUCTION_URL: 'nov.vercel.app',
      DATABASE_URL: 'postgresql://x',
      AUTH_SECRET: 'a'.repeat(40),
    } as any);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('https://shop.example.com');
  });
});

describe('Database URL from Vercel integrations', () => {
  it('uses POSTGRES_PRISMA_URL / POSTGRES_URL when DATABASE_URL is not set', () => {
    const base = { NODE_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'nov.vercel.app', AUTH_SECRET: 'a'.repeat(40) };
    expect(loadEnv({ ...base, POSTGRES_PRISMA_URL: 'postgresql://prisma-url' } as any).DATABASE_URL).toBe('postgresql://prisma-url');
    expect(loadEnv({ ...base, POSTGRES_URL: 'postgresql://pg-url' } as any).DATABASE_URL).toBe('postgresql://pg-url');
    expect(() => loadEnv(base as any)).toThrow(/DATABASE_URL/);
  });
});
