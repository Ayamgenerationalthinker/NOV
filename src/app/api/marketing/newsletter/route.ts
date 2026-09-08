import { NextRequest, NextResponse } from 'next/server';
import { MarketingService } from '@/services/marketing/marketing.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const result = await MarketingService.subscribeNewsletter(email);

    return NextResponse.json({
      success: true,
      message: result.message,
      isNew: result.isNew,
    });
  } catch (error: any) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to subscribe to newsletter.' },
      { status: 400 }
    );
  }
}
