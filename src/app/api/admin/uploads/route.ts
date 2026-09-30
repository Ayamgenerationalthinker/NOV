import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { RBACService } from '@/services/auth/rbac.service';
import { storageBackend } from '@/services/storage/storage.service';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_PRODUCT_FILE_BYTES, isMediaKey, isProductFileKey } from '@/lib/upload-rules';

export const dynamic = 'force-dynamic';

/**
 * GET: tells the admin form how to upload.
 *  - "direct": the browser uploads straight to Vercel Blob (no size limit from Vercel functions)
 *  - "server": the file is posted to our API (local development / R2)
 */
export async function GET() {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ mode: storageBackend === 'vercel-blob' ? 'direct' : 'server' });
}

/** POST: issues a short-lived Vercel Blob upload token, for the owner only. */
export async function POST(request: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  if (storageBackend !== 'vercel-blob') {
    return NextResponse.json({ error: 'Direct uploads need a Vercel Blob store.' }, { status: 400 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (isMediaKey(pathname)) {
          return { allowedContentTypes: IMAGE_TYPES, maximumSizeInBytes: MAX_IMAGE_BYTES, addRandomSuffix: true };
        }
        if (isProductFileKey(pathname)) {
          return { maximumSizeInBytes: MAX_PRODUCT_FILE_BYTES, addRandomSuffix: true };
        }
        throw new Error('Uploads must go to media/ or products/.');
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'Upload could not start.' }, { status: 400 });
  }
}
