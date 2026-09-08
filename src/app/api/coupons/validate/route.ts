import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/services/coupon/coupon.service';
import { SessionService } from '@/services/auth/session.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, message: 'Please provide a coupon code.' },
        { status: 400 }
      );
    }

    if (typeof subtotal !== 'number' || subtotal <= 0) {
      return NextResponse.json(
        { valid: false, message: 'Invalid subtotal amount.' },
        { status: 400 }
      );
    }

    const session = await SessionService.getCurrentSession();
    const customerId = session?.userId;

    const result = await CouponService.validateCoupon({
      code,
      subtotal,
      customerId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Failed to validate coupon code.' },
      { status: 500 }
    );
  }
}
