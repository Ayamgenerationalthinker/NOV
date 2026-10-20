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
  /** Let the browser display the file (PDF reader, video player) instead of saving it. */
  inline?: boolean;
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
  /** Size and type of a stored file, or null if it does not exist (used to verify direct uploads). */
  statFile?(key: string): Promise<{ size: number; contentType: string } | null>;
  /** A one-time URL the browser can PUT a file to directly (storage that supports it). */
  createSignedUploadUrl?(key: string): Promise<string>;
}
