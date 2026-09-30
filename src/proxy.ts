import { NextRequest, NextResponse } from 'next/server';
import { SessionService, SESSION_COOKIE_NAME } from '@/services/auth/session.service';

/**
 * Optimistic gate for the owner console: anyone without a valid admin session cookie is sent
 * to the login page before any admin page renders. This is a first line only; every admin API
 * route and every admin page that reads data still checks the session itself.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await SessionService.verifyToken(token) : null;
  const isAdmin = session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN';

  if (!isAdmin) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
