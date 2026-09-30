import crypto from 'crypto';
import { env } from '@/lib/env';

/**
 * Short-lived, tamper-proof download links served by /api/downloads/file-stream.
 * Used for every storage backend, so paid files are never exposed by a permanent URL.
 */

function sign(key: string, expires: number): string {
  return crypto.createHmac('sha256', env.AUTH_SECRET).update(`download:${key}:${expires}`).digest('hex');
}

export function buildSignedDownloadUrl({
  key,
  originalFileName,
  expiresInSeconds = 900,
}: {
  key: string;
  originalFileName?: string;
  expiresInSeconds?: number;
}): string {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const query = new URLSearchParams({ key, expires: String(expires), sig: sign(key, expires) });
  if (originalFileName) query.set('fn', originalFileName);
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')}/api/downloads/file-stream?${query.toString()}`;
}

export function verifyDownloadSignature(key: string, expires: number, signature: string): boolean {
  if (!Number.isFinite(expires) || Math.floor(Date.now() / 1000) > expires) return false;
  const expected = Buffer.from(sign(key, expires), 'hex');
  const provided = Buffer.from(signature, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
