import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { AnalyticsService } from '@/services/admin/analytics.service';

export const dynamic = 'force-dynamic';

export async function POST(
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
    const body = await request.json().catch(() => ({}));
    const { reason, amount } = body;

    const result = await AnalyticsService.processAdminRefund({
      orderId: id,
      reason,
      adminUserId: session.userId,
      refundAmount: amount !== undefined ? Number(amount) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Order refund processed successfully and entitlements revoked.',
      data: result,
    });
  } catch (error: any) {
    console.error(`Error processing admin refund for order:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 400 }
    );
  }
}
