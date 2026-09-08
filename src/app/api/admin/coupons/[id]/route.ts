import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { CouponService } from '@/services/coupon/coupon.service';
import { DiscountType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const coupon = await CouponService.getCouponById(id);

    if (!coupon) {
      return NextResponse.json(
        { error: `Coupon ${id} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: coupon,
    });
  } catch (error: any) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();

    const updated = await CouponService.updateCoupon(id, {
      description: body.description,
      discountType: body.discountType as DiscountType | undefined,
      discountValue: body.discountValue !== undefined ? parseFloat(body.discountValue) : undefined,
      minOrderAmount: body.minOrderAmount !== undefined ? (body.minOrderAmount === null ? null : parseFloat(body.minOrderAmount)) : undefined,
      maxUses: body.maxUses !== undefined ? (body.maxUses === null ? null : parseInt(body.maxUses, 10)) : undefined,
      perCustomerLimit: body.perCustomerLimit !== undefined ? parseInt(body.perCustomerLimit, 10) : undefined,
      expiresAt: body.expiresAt !== undefined ? (body.expiresAt === null ? null : new Date(body.expiresAt)) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Coupon ${updated.code} updated successfully.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update coupon' },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
    const result = await CouponService.deleteCoupon(id);

    return NextResponse.json({
      success: true,
      message: 'Coupon removed or deactivated successfully.',
      data: result,
    });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete coupon' },
      { status: 400 }
    );
  }
}
