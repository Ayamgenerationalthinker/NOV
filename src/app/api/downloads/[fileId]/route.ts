import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { DownloadService, DownloadError } from '@/services/download/download.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Verify authenticated customer session
    const session = await SessionService.getCurrentSession();
    if (!session || !session.userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await DownloadService.processDownloadRequest({
      fileId,
      customerId: session.userId,
      clientIp,
      userAgent,
    });

    // If client specifically accepts JSON, respond with download URL metadata
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      return NextResponse.json(result);
    }

    // Otherwise directly redirect to the signed download URL (R2 or local streamer)
    return NextResponse.redirect(result.downloadUrl);
  } catch (error) {
    if (error instanceof DownloadError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('Download processing error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while preparing your download.' },
      { status: 500 }
    );
  }
}
