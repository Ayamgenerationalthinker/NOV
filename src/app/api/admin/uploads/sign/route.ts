import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { RBACService } from '@/services/auth/rbac.service';
import { storageService, StorageNotConfiguredError } from '@/services/storage/storage.service';
import { MAX_IMAGE_BYTES, MAX_PRODUCT_FILE_BYTES, isAllowedImage, safeFileName } from '@/lib/upload-rules';

export const dynamic = 'force-dynamic';

const signSchema = z.object({
  kind: z.enum(['image', 'file']),
  fileName: z.string().min(1).max(255),
  contentType: z.string().max(200).default(''),
  size: z.number().int().positive(),
  productId: z.string().regex(/^[A-Za-z0-9_-]+$/).max(64).optional(),
});

/**
 * POST: gives the owner's browser a one-time link to upload one file straight to storage
 * (Supabase), so ebooks and photos are not limited by the request size of serverless functions.
 * The storage key is chosen here, never by the browser.
 */
export async function POST(request: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  if (!storageService.createSignedUploadUrl) {
    return NextResponse.json({ error: 'Direct uploads are not supported by the current storage.' }, { status: 400 });
  }

  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }
  const { kind, fileName, contentType, size, productId } = parsed.data;

  let key: string;
  if (kind === 'image') {
    if (!isAllowedImage(fileName, contentType)) {
      return NextResponse.json({ error: 'Please upload a JPG, PNG, WebP, GIF or AVIF image.' }, { status: 400 });
    }
    if (size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Images must be 10 MB or smaller.' }, { status: 400 });
    }
    const safe = safeFileName(fileName);
    const dot = safe.lastIndexOf('.');
    const base = safe.slice(0, dot).slice(0, 40) || 'image';
    key = `media/products/${base}-${crypto.randomBytes(6).toString('hex')}${safe.slice(dot).toLowerCase()}`;
  } else {
    if (!productId) {
      return NextResponse.json({ error: 'productId is required.' }, { status: 400 });
    }
    if (size > MAX_PRODUCT_FILE_BYTES) {
      return NextResponse.json({ error: 'Files must be 500 MB or smaller.' }, { status: 400 });
    }
    key = `products/${productId}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
  }

  try {
    const uploadUrl = await storageService.createSignedUploadUrl(key);
    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Could not create an upload link:', error);
    return NextResponse.json(
      { error: `Storage refused the upload: ${(error as Error).message}` },
      { status: 502 }
    );
  }
}
