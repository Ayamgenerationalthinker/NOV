import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponService } from '@/services/coupon/coupon.service';
import { DiscountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    couponRedemption: {
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fns) => Promise.all(fns)),
  },
}));

describe('CouponService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly calculates percentage discounts', async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-1',
      code: 'NOV20',
      description: '20% off',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20 as any,
      isActive: true,
      startsAt: new Date(Date.now() - 10000),
      expiresAt: new Date(Date.now() + 100000),
      maxUses: null,
      usedCount: 0,
      minOrderAmount: null,
      perCustomerLimit: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await CouponService.validateCoupon({
      code: 'nov20', // Case-insensitive test
      subtotal: 100,
    });

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(20);
    expect(result.finalTotal).toBe(80);
  });

  it('correctly calculates fixed amount discounts and caps at subtotal', async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-2',
      code: 'FLAT50',
      description: '$50 off',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50 as any,
      isActive: true,
      startsAt: new Date(Date.now() - 10000),
      expiresAt: null,
      maxUses: 100,
      usedCount: 5,
      minOrderAmount: null,
      perCustomerLimit: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Subtotal higher than discount
    const result1 = await CouponService.validateCoupon({
      code: 'FLAT50',
      subtotal: 120,
    });
    expect(result1.valid).toBe(true);
    expect(result1.discountAmount).toBe(50);
    expect(result1.finalTotal).toBe(70);

    // Subtotal lower than discount (must cap at subtotal)
    const result2 = await CouponService.validateCoupon({
      code: 'FLAT50',
      subtotal: 30,
    });
    expect(result2.valid).toBe(true);
    expect(result2.discountAmount).toBe(30);
    expect(result2.finalTotal).toBe(0);
  });

  it('rejects expired coupons', async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-expired',
      code: 'EXPIRED10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10 as any,
      isActive: true,
      startsAt: new Date(Date.now() - 100000),
      expiresAt: new Date(Date.now() - 1000), // In the past
      maxUses: null,
      usedCount: 0,
      minOrderAmount: null,
      perCustomerLimit: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await CouponService.validateCoupon({
      code: 'EXPIRED10',
      subtotal: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.discountAmount).toBe(0);
    expect(result.finalTotal).toBe(100);
    expect(result.message).toContain('expired');
  });

  it('rejects coupons when max redemptions limit is reached', async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-maxed',
      code: 'LIMITED100',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10 as any,
      isActive: true,
      startsAt: null,
      expiresAt: null,
      maxUses: 10,
      usedCount: 10, // Full
      minOrderAmount: null,
      perCustomerLimit: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await CouponService.validateCoupon({
      code: 'LIMITED100',
      subtotal: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.message).toContain('maximum redemptions');
  });

  it('enforces minimum order amount', async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
      id: 'coupon-min',
      code: 'BIGSPENDER',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 25 as any,
      isActive: true,
      startsAt: null,
      expiresAt: null,
      maxUses: null,
      usedCount: 0,
      minOrderAmount: 150 as any,
      perCustomerLimit: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await CouponService.validateCoupon({
      code: 'BIGSPENDER',
      subtotal: 100, // Below minimum 150
    });

    expect(result.valid).toBe(false);
    expect(result.message).toContain('Minimum order amount');
  });
});
