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

  /**
   * Get all coupons for administrative overview
   */
  static async getAllCoupons(params?: { search?: string }) {
    const where: any = {};
    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });
  }

  /**
   * Get coupon by ID
   */
  static async getCouponById(couponId: string) {
    return prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        redemptions: {
          take: 20,
          orderBy: { redeemedAt: 'desc' },
          include: {
            order: {
              select: { orderNumber: true, total: true, currency: true },
            },
            customer: {
              select: { email: true, name: true },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new coupon
   */
  static async createCoupon(data: {
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount?: number;
    maxUses?: number;
    perCustomerLimit?: number;
    startsAt?: Date;
    expiresAt?: Date;
    isActive?: boolean;
  }) {
    const normalizedCode = data.code.trim().toUpperCase();

    if (!normalizedCode || normalizedCode.length < 3) {
      throw new Error('Coupon code must be at least 3 characters.');
    }

    if (data.discountValue <= 0) {
      throw new Error('Discount value must be greater than zero.');
    }

    if (data.discountType === DiscountType.PERCENTAGE && data.discountValue > 100) {
      throw new Error('Percentage discount cannot exceed 100%.');
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new Error(`Coupon code "${normalizedCode}" already exists.`);
    }

    return prisma.coupon.create({
      data: {
        code: normalizedCode,
        description: data.description?.trim() || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount !== undefined ? data.minOrderAmount : null,
        maxUses: data.maxUses !== undefined ? data.maxUses : null,
        perCustomerLimit: data.perCustomerLimit !== undefined ? data.perCustomerLimit : 1,
        startsAt: data.startsAt || new Date(),
        expiresAt: data.expiresAt || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Update an existing coupon
   */
  static async updateCoupon(
    couponId: string,
    data: {
      description?: string;
      discountType?: DiscountType;
      discountValue?: number;
      minOrderAmount?: number | null;
      maxUses?: number | null;
      perCustomerLimit?: number;
      expiresAt?: Date | null;
      isActive?: boolean;
    }
  ) {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new Error(`Coupon ${couponId} not found.`);
    }

    if (data.discountValue !== undefined) {
      if (data.discountValue <= 0) {
        throw new Error('Discount value must be greater than zero.');
      }
      const type = data.discountType || coupon.discountType;
      if (type === DiscountType.PERCENTAGE && data.discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%.');
      }
    }

    return prisma.coupon.update({
      where: { id: couponId },
      data: {
        description: data.description !== undefined ? data.description : coupon.description,
        discountType: data.discountType || coupon.discountType,
        discountValue: data.discountValue !== undefined ? data.discountValue : coupon.discountValue,
        minOrderAmount: data.minOrderAmount !== undefined ? data.minOrderAmount : coupon.minOrderAmount,
        maxUses: data.maxUses !== undefined ? data.maxUses : coupon.maxUses,
        perCustomerLimit: data.perCustomerLimit !== undefined ? data.perCustomerLimit : coupon.perCustomerLimit,
        expiresAt: data.expiresAt !== undefined ? data.expiresAt : coupon.expiresAt,
        isActive: data.isActive !== undefined ? data.isActive : coupon.isActive,
      },
    });
  }

  /**
   * Toggle coupon active state
   */
  static async toggleCouponStatus(couponId: string, isActive: boolean) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: { isActive },
    });
  }

  /**
   * Delete coupon if unused, or deactivate if redemptions exist
   */
  static async deleteCoupon(couponId: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!coupon) {
      throw new Error(`Coupon ${couponId} not found.`);
    }

    if (coupon._count.redemptions > 0 || coupon.usedCount > 0) {
      // Soft-deactivate to prevent breaking historical orders/invoices
      return prisma.coupon.update({
        where: { id: couponId },
        data: { isActive: false },
      });
    }

    return prisma.coupon.delete({
      where: { id: couponId },
    });
  }
}
