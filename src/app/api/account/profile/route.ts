import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { AccountService } from '@/services/account/account.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const profileSchema = z.object({
  name: z.string().max(100).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const user = await AccountService.updateProfile(session.userId, {
      name: parsed.data.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
