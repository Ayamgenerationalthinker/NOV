import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { AccountService } from '@/services/account/account.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await AccountService.getCustomerOrders(session.userId);
    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Failed to fetch account orders:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
