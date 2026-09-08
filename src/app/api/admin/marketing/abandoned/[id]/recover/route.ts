import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { MarketingService } from '@/services/marketing/marketing.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin privileges required.' },
        { status: 403 }
      );
    }

    const { id } = await props.params;
    const body = await request.json().catch(() => ({}));
    const discountCode = body.discountCode || 'RECOVER15';

    const result = await MarketingService.sendAbandonedCheckoutReminder(id, discountCode);

    return NextResponse.json({
      success: true,
      message: `Recovery reminder email sent to ${result.recipientEmail} for order #${result.orderNumber}.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error sending abandoned checkout recovery email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send recovery email' },
      { status: 400 }
    );
  }
}
