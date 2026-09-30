import { Readable } from 'stream';
import type { ReadableStream as NodeWebReadableStream } from 'stream/web';
import { put, get, del, head, BlobNotFoundError } from '@vercel/blob';
import {
  IStorageService,
  UploadFileParams,
  UploadFileResult,
  SignedUrlParams,
  FileStreamResult,
} from './storage.interface';
import { buildSignedDownloadUrl } from '@/lib/signed-download';

/**
 * Vercel Blob (private store). Nothing in the store is publicly reachable:
 * paid files go through signed /api/downloads/file-stream links and product images
 * through /api/media. Uses BLOB_READ_WRITE_TOKEN, which Vercel sets when a Blob store
 * is connected to the project.
 */
export class VercelBlobStorageAdapter implements IStorageService {
  async uploadFile({ fileBuffer, key, contentType }: UploadFileParams): Promise<UploadFileResult> {
    const result = await put(key, fileBuffer, {
      access: 'private',
      contentType,
      addRandomSuffix: false,
    });
    return { key: result.pathname, size: fileBuffer.length, contentType };
  }

  async getSignedDownloadUrl({ key, expiresInSeconds = 900, originalFileName }: SignedUrlParams): Promise<string> {
    return buildSignedDownloadUrl({ key, originalFileName, expiresInSeconds });
  }

  async deleteFile(key: string): Promise<void> {
    await del(key);
  }

  async getFileStream(key: string): Promise<FileStreamResult> {
    const result = await get(key, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      throw new Error(`File not found in blob storage: ${key}`);
    }
    return {
      stream: Readable.fromWeb(result.stream as unknown as NodeWebReadableStream),
      contentType: result.blob.contentType || 'application/octet-stream',
      contentLength: result.blob.size,
    };
  }

  async statFile(key: string): Promise<{ size: number; contentType: string } | null> {
    try {
      const info = await head(key);
      return { size: info.size, contentType: info.contentType };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  }
}
