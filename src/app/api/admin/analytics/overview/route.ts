import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { AnalyticsService } from '@/services/admin/analytics.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const [overview, timeSeries, topProducts] = await Promise.all([
      AnalyticsService.getOverviewMetrics(),
      AnalyticsService.getRevenueTimeSeries(30),
      AnalyticsService.getTopProducts(5),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview,
        timeSeries,
        topProducts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin analytics overview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}
