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
    const customer = await AnalyticsService.getCustomerDetails(id);

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error: any) {
    console.error(`Error fetching customer details:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer details' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}
