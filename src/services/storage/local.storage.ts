import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import {
  IStorageService,
  UploadFileParams,
  UploadFileResult,
  SignedUrlParams,
  FileStreamResult,
} from './storage.interface';
import { buildSignedDownloadUrl } from '@/lib/signed-download';

export class LocalStorageAdapter implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.private_storage');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    const safeKey = key.replace(/\.\./g, '').replace(/^[/\\]+/, '');
    return path.join(this.baseDir, safeKey);
  }

  async uploadFile({
    fileBuffer,
    key,
    contentType,
  }: UploadFileParams): Promise<UploadFileResult> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, fileBuffer);

    // Also write metadata sidecar for content-type
    fs.writeFileSync(
      `${filePath}.meta.json`,
      JSON.stringify({ contentType, originalKey: key, size: fileBuffer.length })
    );

    return {
      key,
      size: fileBuffer.length,
      contentType,
    };
  }

  async getSignedDownloadUrl({
    key,
    expiresInSeconds = 900, // 15 minutes
    originalFileName,
  }: SignedUrlParams): Promise<string> {
    return buildSignedDownloadUrl({ key, originalFileName, expiresInSeconds });
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const metaPath = `${filePath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
  }

  async getFileStream(key: string): Promise<FileStreamResult> {
    const filePath = this.getFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found in local storage: ${key}`);
    }

    let contentType = 'application/octet-stream';
    const metaPath = `${filePath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (meta.contentType) contentType = meta.contentType;
      } catch {
        // Fallback to default
      }
    }

    const stats = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);

    return {
      stream,
      contentType,
      contentLength: stats.size,
    };
  }
}
