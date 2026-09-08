import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { AccountService } from '@/services/account/account.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid password input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await AccountService.changePassword(session.userId, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update password' },
      { status: 400 }
    );
  }
}
