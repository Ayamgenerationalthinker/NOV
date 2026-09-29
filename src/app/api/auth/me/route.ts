import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await SessionService.getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  let user = null;

  try {
    // Fetch fresh user data from PostgreSQL if available
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });
  } catch {
    // Ignore database error and fallback to session/dev store
  }

  if (!user) {
    user = {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      emailVerified: null,
      twoFactorEnabled: false,
      createdAt: new Date(),
    };
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
