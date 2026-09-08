import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' });
  const cookieOptions = SessionService.getCookieOptions(true);
  response.cookies.set(cookieOptions.name, '', cookieOptions);
  return response;
}
