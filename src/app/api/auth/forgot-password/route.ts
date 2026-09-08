import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validators/auth';
import { TokenService } from '@/services/auth/token.service';
import { EmailService } from '@/services/email/email.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = forgotPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = parseResult.data;

    // Check if user exists (always return success message to prevent user enumeration attacks)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Invalidate existing reset tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email },
      });

      // Generate new secure reset token
      const token = TokenService.generateSecureToken();
      const expiresAt = TokenService.getExpirationDate(1); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          email,
          token,
          expiresAt,
        },
      });

      // Send password reset email
      await EmailService.sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been dispatched.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
