import { prisma } from '@/lib/prisma';
import { DiscountType } from '@prisma/client';

export interface ValidateCouponParams {
  code: string;
  subtotal: number;
  customerId?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    description: string | null;
    discountType: DiscountType;
    discountValue: number;
  };
  discountAmount: number;
  finalTotal: number;
  message?: string;
}

export class CouponService {
  /**
   * Validate a coupon code and calculate applicable discount
   */
  static async validateCoupon({
    code,
    subtotal,
    customerId,
  }: ValidateCouponParams): Promise<CouponValidationResult> {
    const normalizedCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        discountAmount: 0,
        finalTotal: subtotal,
        message: 'Invalid or inactive coupon code.',
      };
    }

    const now = new Date();

    if (coupon.startsAt && coupon.startsAt > now) {
      return {
        valid: false,
        discountAmount: 0,
        finalTotal: subtotal,
        message: 'This coupon promotion has not started yet.',
      };
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return {
        valid: false,
        discountAmount: 0,
        finalTotal: subtotal,
        message: 'This coupon code has expired.',
      };
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return {
        valid: false,
        discountAmount: 0,
        finalTotal: subtotal,
        message: 'This coupon has reached its maximum redemptions limit.',
      };
    }

    const minAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (minAmount > 0 && subtotal < minAmount) {
      return {
        valid: false,
        discountAmount: 0,
        finalTotal: subtotal,
        message: `Minimum order amount of $${minAmount.toFixed(2)} required for this coupon.`,
      };
    }

    // Check per-customer limit if customer is authenticated
    if (customerId && coupon.perCustomerLimit) {
      const redemptionsCount = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          customerId,
        },
      });

      if (redemptionsCount >= coupon.perCustomerLimit) {
        return {
          valid: false,
          discountAmount: 0,
          finalTotal: subtotal,
          message: 'You have already used this coupon code.',
        };
      }
    }

    // Calculate discount
    let discountAmount = 0;
    const discountVal = Number(coupon.discountValue);

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = Math.round(((subtotal * discountVal) / 100) * 100) / 100;
    } else {
      discountAmount = discountVal;
    }

    // Ensure discount never exceeds subtotal
    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
    const finalTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: discountVal,
      },
      discountAmount,
      finalTotal,
    };
  }

  /**
   * Record coupon redemption when an order is finalized
   */
  static async recordCouponRedemption({
    couponId,
    orderId,
    customerId,
    discountAmount,
  }: {
    couponId: string;
    orderId: string;
    customerId?: string;
    discountAmount: number;
  }) {
    return prisma.$transaction([
      prisma.couponRedemption.create({
        data: {
          couponId,
          orderId,
          customerId: customerId || null,
          discountAmount,
        },
      }),
      prisma.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: { increment: 1 },
        },
      }),
    ]);
  }
}
