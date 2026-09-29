import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginSchema } from '@/lib/validators/auth';
import { PasswordService } from '@/services/auth/password.service';
import { SessionService } from '@/services/auth/session.service';
import { DevUserStore } from '@/lib/dev-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Retrieve user with password hash
    let user: { id: string; email: string; name: string | null; role: any; passwordHash: string | null } | null = null;

    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL unavailable, checking local development store:', dbErr);
      user = DevUserStore.findByEmail(email);
    }

    if (!user || !user.passwordHash) {
      // Fallback check if user was created in DevUserStore
      const devUser = DevUserStore.findByEmail(email);
      if (devUser) {
        user = devUser;
      }
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password hash
    const isPasswordValid = await PasswordService.verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate Session Token
    const token = await SessionService.createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Attach HttpOnly cookie
    const cookieOptions = SessionService.getCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    );
  }
}
