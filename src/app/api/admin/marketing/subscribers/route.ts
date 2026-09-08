import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { MarketingService } from '@/services/marketing/marketing.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin privileges required.' },
        { status: 403 }
      );
    }

    const data = await MarketingService.getSubscribers();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}
