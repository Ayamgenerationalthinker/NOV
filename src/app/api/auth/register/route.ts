import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validators/auth';
import { PasswordService } from '@/services/auth/password.service';
import { SessionService } from '@/services/auth/session.service';
import { Role } from '@prisma/client';
import { DevUserStore } from '@/lib/dev-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parseResult.data;

    let user: { id: string; email: string; name: string | null; role: Role } | null = null;
    const passwordHash = await PasswordService.hashPassword(password);

    try {
      // Check if email already exists in PostgreSQL
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists' },
          { status: 409 }
        );
      }

      // Create Customer account in PostgreSQL
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          role: Role.CUSTOMER,
        },
      });
    } catch (dbError) {
      console.warn('⚠️ PostgreSQL unavailable, using local development fallback:', dbError);
      
      const existingDevUser = DevUserStore.findByEmail(email);
      if (existingDevUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists' },
          { status: 409 }
        );
      }

      user = DevUserStore.create({
        email,
        name: name || null,
        passwordHash,
        role: Role.CUSTOMER,
      });
    }

    // Generate Session
    const token = await SessionService.createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );

    // Attach HttpOnly cookie
    const cookieOptions = SessionService.getCookieOptions();
    response.cookies.set(cookieOptions.name, token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during account registration' },
      { status: 500 }
    );
  }
}
