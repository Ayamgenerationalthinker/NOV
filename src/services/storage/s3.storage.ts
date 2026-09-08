import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import {
  IStorageService,
  UploadFileParams,
  UploadFileResult,
  SignedUrlParams,
  FileStreamResult,
} from './storage.interface';
import { env } from '@/lib/env';

export class S3StorageAdapter implements IStorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.R2_BUCKET_NAME || 'nov-private-products';

    const endpoint =
      env.R2_ENDPOINT ||
      (env.R2_ACCOUNT_ID
        ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined);

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials:
        env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.R2_ACCESS_KEY_ID,
              secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async uploadFile({
    fileBuffer,
    key,
    contentType,
  }: UploadFileParams): Promise<UploadFileResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await this.client.send(command);

    return {
      key,
      size: fileBuffer.length,
      contentType,
    };
  }

  async getSignedDownloadUrl({
    key,
    expiresInSeconds = 900, // default 15 minutes
    originalFileName,
  }: SignedUrlParams): Promise<string> {
    const contentDisposition = originalFileName
      ? `attachment; filename="${encodeURIComponent(originalFileName)}"`
      : 'attachment';

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async getFileStream(key: string): Promise<FileStreamResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);

    return {
      stream: response.Body as unknown as Readable,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
    };
  }
}
