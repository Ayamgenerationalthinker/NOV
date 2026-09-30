import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { storageService } from '@/services/storage/storage.service';
import { isMediaKey } from '@/lib/upload-rules';

export const dynamic = 'force-dynamic';

/**
 * Serves product images (and only product images, under media/) from private storage.
 * Keys are unique per upload, so responses can be cached by the CDN forever.
 * Paid files live under products/ and are never served here.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join('/');

  if (!isMediaKey(key)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const { stream, contentType, contentLength } = await storageService.getFileStream(key);
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    if (contentLength) headers.set('Content-Length', String(contentLength));
    return new NextResponse(Readable.toWeb(stream as Readable) as ReadableStream, { status: 200, headers });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
