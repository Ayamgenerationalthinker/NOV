import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { CouponService } from '@/services/coupon/coupon.service';
import { DiscountType } from '@prisma/client';

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
    const search = searchParams.get('search') || undefined;

    const coupons = await CouponService.getAllCoupons({ search });

    return NextResponse.json({
      success: true,
      data: coupons,
    });
  } catch (error: any) {
    console.error('Error fetching admin coupons:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupons' },
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
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      perCustomerLimit,
      startsAt,
      expiresAt,
      isActive,
    } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required coupon fields (code, discountType, discountValue).' },
        { status: 400 }
      );
    }

    const coupon = await CouponService.createCoupon({
      code,
      description,
      discountType: discountType as DiscountType,
      discountValue: parseFloat(discountValue),
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      perCustomerLimit: perCustomerLimit ? parseInt(perCustomerLimit, 10) : undefined,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Coupon ${coupon.code} created successfully.`,
        data: coupon,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create coupon' },
      { status: 400 }
    );
  }
}
