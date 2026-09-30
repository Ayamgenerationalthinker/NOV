'use client';

import { upload } from '@vercel/blob/client';

/**
 * Browser-side uploads for the owner's product form.
 * On Vercel (Blob store connected) files go straight from the browser to storage, so ebooks and
 * photos are not limited by the ~4.5 MB request size of serverless functions. Locally they are
 * posted to the app's own API.
 */

let modePromise: Promise<'direct' | 'server'> | null = null;

function uploadMode(): Promise<'direct' | 'server'> {
  if (!modePromise) {
    modePromise = fetch('/api/admin/uploads')
      .then((res) => (res.ok ? res.json() : { mode: 'server' }))
      .then((data) => (data.mode === 'direct' ? 'direct' : 'server'))
      .catch(() => 'server' as const);
  }
  return modePromise;
}

function safeName(name: string): string {
  return name.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-120) || 'file';
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

/** Uploads a product image and returns the URL to store on the product. */
export async function uploadProductImage(file: File): Promise<string> {
  if ((await uploadMode()) === 'direct') {
    const blob = await upload(`media/products/${safeName(file.name)}`, file, {
      access: 'private',
      handleUploadUrl: '/api/admin/uploads',
      contentType: file.type,
    });
    return `/api/media/${blob.pathname}`;
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
  if ((await uploadMode()) === 'direct') {
    const blob = await upload(`products/${productId}/${safeName(file.name)}`, file, {
      access: 'private',
      handleUploadUrl: '/api/admin/uploads',
      contentType: file.type || 'application/octet-stream',
      multipart: file.size > 50 * 1024 * 1024,
      onUploadProgress: onProgress ? ({ percentage }) => onProgress(percentage) : undefined,
    });
    const res = await fetch(`/api/admin/products/${productId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileKey: blob.pathname, fileName: file.name }),
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
