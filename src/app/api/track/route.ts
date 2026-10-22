import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SessionService, SESSION_COOKIE_NAME } from '@/services/auth/session.service';
import { VISIT_EVENT_TYPES, VisitService, describeUserAgent, isBot } from '@/services/analytics/visit.service';

export const dynamic = 'force-dynamic';

const eventSchema = z.object({
  visitorId: z.string().regex(/^[a-z0-9-]{8,64}$/i),
  sessionId: z.string().regex(/^[a-z0-9-]{8,64}$/i),
  type: z.enum(VISIT_EVENT_TYPES),
  path: z.string().startsWith('/').max(300),
  label: z.string().trim().max(160).optional(),
  source: z.string().trim().max(120).optional(),
});

function header(request: NextRequest, name: string) {
  const value = request.headers.get(name);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Records one anonymous page view or action from the shop tracker. Always answers 204 so the
 * browser never shows an error; bots and the signed-in owner are silently skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    if (isBot(userAgent)) return new NextResponse(null, { status: 204 });

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await SessionService.verifyToken(token) : null;
    if (session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN') return new NextResponse(null, { status: 204 });

    // sendBeacon posts text/plain, so read the body as text.
    let body: unknown = null;
    try {
      body = JSON.parse(await request.text());
    } catch {
      return new NextResponse(null, { status: 204 });
    }
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) return new NextResponse(null, { status: 204 });

    await VisitService.record({
      ...parsed.data,
      // Vercel adds the visitor's rough location; elsewhere these are simply missing.
      country: header(request, 'x-vercel-ip-country'),
      city: header(request, 'x-vercel-ip-city'),
      ...describeUserAgent(userAgent),
    });
  } catch (error) {
    console.error('Visit tracking error:', error);
  }
  return new NextResponse(null, { status: 204 });
}
