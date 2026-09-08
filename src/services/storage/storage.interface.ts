import { Readable } from 'stream';

export interface UploadFileParams {
  fileBuffer: Buffer;
  key: string;
  contentType: string;
}

export interface UploadFileResult {
  key: string;
  size: number;
  contentType: string;
}

export interface SignedUrlParams {
  key: string;
  expiresInSeconds?: number;
  originalFileName?: string;
}

export interface FileStreamResult {
  stream: Readable;
  contentType: string;
  contentLength?: number;
}

export interface IStorageService {
  uploadFile(params: UploadFileParams): Promise<UploadFileResult>;
  getSignedDownloadUrl(params: SignedUrlParams): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileStream(key: string): Promise<FileStreamResult>;
}
