import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { storageService } from '@/services/storage/storage.service';
import { verifyDownloadSignature } from '@/lib/signed-download';

export const dynamic = 'force-dynamic';

/** Streams a file for a short-lived signed link (created only after entitlement/payment checks). */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const expires = Number(searchParams.get('expires'));
  const sig = searchParams.get('sig');
  const fileName = (searchParams.get('fn') || 'download').replace(/[\r\n"]/g, '');

  if (!key || !sig || !Number.isFinite(expires)) {
    return new NextResponse('Invalid download link.', { status: 400 });
  }

  if (!verifyDownloadSignature(key, expires, sig)) {
    return new NextResponse('This download link has expired. Go back to your order page to get a fresh one.', { status: 403 });
  }

  try {
    const { stream, contentType, contentLength } = await storageService.getFileStream(key);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    if (contentLength) headers.set('Content-Length', contentLength.toString());

    return new NextResponse(Readable.toWeb(stream as Readable) as ReadableStream, { status: 200, headers });
  } catch (error) {
    console.error('File streaming error:', error);
    return new NextResponse('File could not be found.', { status: 404 });
  }
}
