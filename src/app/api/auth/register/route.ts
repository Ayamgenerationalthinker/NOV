import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validators/auth';
import { PasswordService } from '@/services/auth/password.service';
import { SessionService } from '@/services/auth/session.service';
import { Role } from '@prisma/client';

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

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await PasswordService.hashPassword(password);

    // Create Customer account
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role: Role.CUSTOMER,
      },
    });

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
    
    // Check for Prisma/Database connection error
    const isDbError =
      error?.code === 'P1001' || // Can't reach database server
      error?.code === 'P1000' || // Authentication failed
      error?.code === 'ECONNREFUSED' ||
      error?.message?.includes('connection') ||
      error?.message?.includes('connect');

    const errorMessage =
      isDbError && process.env.NODE_ENV !== 'production'
        ? 'Database connection failed. Please verify your PostgreSQL DATABASE_URL in .env and run "npx prisma db push".'
        : 'An error occurred during account registration';

    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { details: error?.message }),
      },
      { status: 500 }
    );
  }
}
