'use client';

import { upload } from '@vercel/blob/client';

/**
 * Browser-side uploads for the owner's product form.
 * In production files go straight from the browser to storage (Supabase Storage or Vercel Blob),
 * so ebooks and photos are not limited by the ~4.5 MB request size of serverless functions.
 * Locally they are posted to the app's own API.
 */

type UploadMode = 'direct' | 'signed' | 'server';

let modePromise: Promise<UploadMode> | null = null;

function uploadMode(): Promise<UploadMode> {
  if (!modePromise) {
    modePromise = fetch('/api/admin/uploads')
      .then((res) => (res.ok ? res.json() : { mode: 'server' }))
      .then((data): UploadMode => (data.mode === 'direct' || data.mode === 'signed' ? data.mode : 'server'))
      .catch(() => 'server' as const);
  }
  return modePromise;
}

function safeName(name: string): string {
  return name.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-120) || 'file';
}

/**
 * Browsers (Windows especially) often report no type for .mov, .m4a and similar files. Stored as
 * a generic binary, some phones then refuse to play them, so fall back on the file extension.
 */
const TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  zip: 'application/zip',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
};

function contentTypeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  return TYPES_BY_EXTENSION[ext] ?? 'application/octet-stream';
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

/** Sends the file to a one-time storage link, reporting progress. */
function putToSignedUrl(url: string, file: File, onProgress?: (percentage: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentTypeOf(file));
    xhr.setRequestHeader('x-upsert', 'true');
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      if (xhr.status === 413) {
        return reject(new Error('This file is larger than your storage plan allows (50 MB per file on the free Supabase plan).'));
      }
      let message = `Upload failed (${xhr.status}).`;
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.message || data.error) message = data.message || data.error;
      } catch {
        // keep the generic message
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Upload interrupted. Check your connection and try again.'));
    xhr.send(file);
  });
}

/** Asks our server for a one-time upload link, uploads the file to it, and returns its storage key. */
async function uploadViaSignedUrl(
  kind: 'image' | 'file',
  file: File,
  productId?: string,
  onProgress?: (percentage: number) => void
): Promise<string> {
  const res = await fetch('/api/admin/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, fileName: file.name, contentType: contentTypeOf(file), size: file.size, productId }),
  });
  if (!res.ok) throw new Error(await readError(res, 'Upload could not start'));
  const { uploadUrl, key } = (await res.json()) as { uploadUrl: string; key: string };
  await putToSignedUrl(uploadUrl, file, onProgress);
  return key;
}

/** Uploads a product image and returns the URL to store on the product. */
export async function uploadProductImage(file: File): Promise<string> {
  const mode = await uploadMode();

  if (mode === 'direct') {
    const blob = await upload(`media/products/${safeName(file.name)}`, file, {
      access: 'private',
      handleUploadUrl: '/api/admin/uploads',
      contentType: file.type,
    });
    return `/api/media/${blob.pathname}`;
  }

  if (mode === 'signed') {
    return `/api/media/${await uploadViaSignedUrl('image', file)}`;
  }

  const form = new FormData();
  form.append('file', file);
  form.append('folder', 'products');
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(await readError(res, 'Image upload failed'));
  return (await res.json()).url as string;
}

/** Uploads the file buyers receive and attaches it to the product. Returns the saved file record. */
export async function uploadProductFile(
  productId: string,
  file: File,
  onProgress?: (percentage: number) => void
): Promise<{ id: string; fileName: string; fileSize: number }> {
  const mode = await uploadMode();

  if (mode === 'direct' || mode === 'signed') {
    let fileKey: string;
    if (mode === 'direct') {
      const blob = await upload(`products/${productId}/${safeName(file.name)}`, file, {
        access: 'private',
        handleUploadUrl: '/api/admin/uploads',
        contentType: contentTypeOf(file),
        multipart: file.size > 50 * 1024 * 1024,
        onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
      });
      fileKey = blob.pathname;
    } else {
      fileKey = await uploadViaSignedUrl('file', file, productId, onProgress);
    }
    const res = await fetch(`/api/admin/products/${productId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey, fileName: file.name }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Could not attach the file'));
    return (await res.json()).file;
  }

  const form = new FormData();
  form.append('file', file);
  form.append('isPrimary', 'true');
  const res = await fetch(`/api/admin/products/${productId}/files`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await readError(res, 'File upload failed'));
  return (await res.json()).file;
}
