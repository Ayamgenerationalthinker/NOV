import { NextRequest, NextResponse } from 'next/server';
import { MarketingService } from '@/services/marketing/marketing.service';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campaign = MarketingService.getFlashSaleCampaign();
    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error('Error fetching flash sale campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flash sale campaign' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin privileges required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = MarketingService.updateFlashSaleCampaign(body);

    return NextResponse.json({
      success: true,
      message: 'Flash sale campaign updated successfully.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating flash sale campaign:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update campaign' },
      { status: 400 }
    );
  }
}
