import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponService } from '@/services/coupon/coupon.service';
import { prisma } from '@/lib/prisma';
import { DiscountType } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    coupon: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    couponRedemption: {
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('Admin Coupon Management (CouponService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('should reject coupon codes shorter than 3 characters', async () => {
      await expect(
        CouponService.createCoupon({
          code: 'AB',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 10,
        })
      ).rejects.toThrow('Coupon code must be at least 3 characters');
    });

    it('should reject non-positive discount values', async () => {
      await expect(
        CouponService.createCoupon({
          code: 'PROMO10',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 0,
        })
      ).rejects.toThrow('Discount value must be greater than zero');
    });

    it('should reject percentage discounts exceeding 100%', async () => {
      await expect(
        CouponService.createCoupon({
          code: 'SUPER150',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 150,
        })
      ).rejects.toThrow('Percentage discount cannot exceed 100%');
    });

    it('should reject duplicate coupon codes', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'existing-id',
        code: 'SAVE20',
      } as any);

      await expect(
        CouponService.createCoupon({
          code: 'SAVE20',
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
        })
      ).rejects.toThrow('Coupon code "SAVE20" already exists');
    });

    it('should create coupon with normalized uppercase code and default values', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.coupon.create).mockResolvedValueOnce({
        id: 'coupon-1',
        code: 'SPRING30',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 30 as any,
        isActive: true,
      } as any);

      const res = await CouponService.createCoupon({
        code: '  spring30  ',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 30,
      });

      expect(prisma.coupon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'SPRING30',
          discountValue: 30,
          isActive: true,
          perCustomerLimit: 1,
        }),
      });
      expect(res.code).toBe('SPRING30');
    });
  });

  describe('updateCoupon', () => {
    it('should throw if coupon does not exist', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce(null);

      await expect(
        CouponService.updateCoupon('missing-id', { discountValue: 15 })
      ).rejects.toThrow('Coupon missing-id not found');
    });

    it('should validate percentage bound on update', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'c1',
        discountType: DiscountType.PERCENTAGE,
      } as any);

      await expect(
        CouponService.updateCoupon('c1', { discountValue: 105 })
      ).rejects.toThrow('Percentage discount cannot exceed 100%');
    });

    it('should successfully update coupon properties', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'c1',
        code: 'SUMMER20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20 as any,
      } as any);

      vi.mocked(prisma.coupon.update).mockResolvedValueOnce({
        id: 'c1',
        code: 'SUMMER20',
        discountValue: 25 as any,
        description: 'New summer sale',
      } as any);

      const updated = await CouponService.updateCoupon('c1', {
        discountValue: 25,
        description: 'New summer sale',
      });

      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({
          discountValue: 25,
          description: 'New summer sale',
        }),
      });
      expect(updated.discountValue).toBe(25);
    });
  });

  describe('deleteCoupon', () => {
    it('should hard-delete unused coupons with 0 redemptions', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'c-unused',
        usedCount: 0,
        _count: { redemptions: 0 },
      } as any);

      vi.mocked(prisma.coupon.delete).mockResolvedValueOnce({ id: 'c-unused' } as any);

      await CouponService.deleteCoupon('c-unused');

      expect(prisma.coupon.delete).toHaveBeenCalledWith({
        where: { id: 'c-unused' },
      });
    });

    it('should soft-deactivate used coupons to preserve historical integrity', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({
        id: 'c-used',
        usedCount: 5,
        _count: { redemptions: 5 },
      } as any);

      vi.mocked(prisma.coupon.update).mockResolvedValueOnce({
        id: 'c-used',
        isActive: false,
      } as any);

      await CouponService.deleteCoupon('c-used');

      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c-used' },
        data: { isActive: false },
      });
      expect(prisma.coupon.delete).not.toHaveBeenCalled();
    });
  });
});
