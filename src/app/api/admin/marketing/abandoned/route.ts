import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { MarketingService } from '@/services/marketing/marketing.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin privileges required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hoursAgo = parseInt(searchParams.get('hoursAgo') || '1', 10);

    const abandonedOrders = await MarketingService.getAbandonedCheckouts(hoursAgo);

    return NextResponse.json({
      success: true,
      data: abandonedOrders,
    });
  } catch (error: any) {
    console.error('Error fetching abandoned checkouts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch abandoned checkouts' },
      { status: 500 }
    );
  }
}
