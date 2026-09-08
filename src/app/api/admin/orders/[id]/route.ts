import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { AnalyticsService } from '@/services/admin/analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const order = await AnalyticsService.getOrderDetails(id);

    if (!order) {
      return NextResponse.json(
        { error: `Order ${id} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error(`Error fetching order details:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order details' },
      { status: 500 }
    );
  }
}
