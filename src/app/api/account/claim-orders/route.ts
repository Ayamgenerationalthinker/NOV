import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { AccountService } from '@/services/account/account.service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.userId || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await AccountService.claimGuestOrders(session.userId, session.email);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Claim guest orders error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to claim guest orders' },
      { status: 500 }
    );
  }
}
