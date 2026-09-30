import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RBACService } from '@/services/auth/rbac.service';
import { storageBackend, storageService, StorageNotConfiguredError } from '@/services/storage/storage.service';
import { MAX_IMAGE_BYTES, isAllowedImage, safeFileName } from '@/lib/upload-rules';

export const dynamic = 'force-dynamic';

/**
 * Product image upload through the server (local development, R2/S3).
 * On Vercel with a Blob store the admin form uploads images directly to storage instead
 * (see /api/admin/uploads), so large photos are not limited by the function body size.
 */
export async function POST(request: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Images must be 10 MB or smaller.' }, { status: 400 });
    }
    if (!isAllowedImage(file.name, file.type || '')) {
      return NextResponse.json({ error: 'Please upload a JPG, PNG, WebP, GIF or AVIF image.' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const base = safeFileName(path.basename(file.name, ext)).slice(0, 40);
    const finalFileName = `${base}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    if (storageBackend === 'local') {
      const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'products');
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, finalFileName), fileBuffer);
      return NextResponse.json({ url: `/uploads/products/${finalFileName}`, fileName: file.name, fileSize: file.size, mimeType: file.type });
    }

    const key = `media/products/${finalFileName}`;
    await storageService.uploadFile({ fileBuffer, key, contentType: file.type });
    const url = process.env.R2_PUBLIC_DOMAIN && storageBackend === 's3'
      ? `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`
      : `/api/media/${key}`;

    return NextResponse.json({ url, fileName: file.name, fileSize: file.size, mimeType: file.type });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('File upload failure:', error);
    return NextResponse.json({ error: 'Image upload failed.' }, { status: 500 });
  }
}
