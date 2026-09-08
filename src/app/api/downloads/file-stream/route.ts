import { NextRequest, NextResponse } from 'next/server';
import { localStorageAdapter } from '@/services/storage/storage.service';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get('key');
  const expires = searchParams.get('expires');
  const sig = searchParams.get('sig');
  const fileName = searchParams.get('fn') || 'download';

  if (!key || !expires || !sig) {
    return new NextResponse('Invalid download link parameters.', { status: 400 });
  }

  const expiresNum = parseInt(expires, 10);
  if (isNaN(expiresNum)) {
    return new NextResponse('Invalid expiration timestamp.', { status: 400 });
  }

  const isValid = localStorageAdapter.verifyLocalSignature(key, expiresNum, sig);
  if (!isValid) {
    return new NextResponse('Download signature expired or invalid.', { status: 403 });
  }

  try {
    const { stream, contentType, contentLength } = await localStorageAdapter.getFileStream(key);

    // Convert NodeJS.ReadableStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        (stream as Readable).on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        (stream as Readable).on('end', () => {
          controller.close();
        });
        (stream as Readable).on('error', (err) => {
          controller.error(err);
        });
      },
    });

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );
    if (contentLength) {
      headers.set('Content-Length', contentLength.toString());
    }

    return new NextResponse(webStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('File streaming error:', error);
    return new NextResponse('File could not be found.', { status: 404 });
  }
}
