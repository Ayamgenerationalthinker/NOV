import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewService } from '@/services/review/review.service';
import { prisma } from '@/lib/prisma';
import { EntitlementStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
    },
    entitlement: {
      findUnique: vi.fn(),
    },
    review: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('ReviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrUpdateReview', () => {
    it('should reject invalid ratings', async () => {
      await expect(
        ReviewService.createOrUpdateReview({
          productId: 'prod-1',
          customerId: 'cust-1',
          rating: 6,
          comment: 'Great product!',
        })
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      await expect(
        ReviewService.createOrUpdateReview({
          productId: 'prod-1',
          customerId: 'cust-1',
          rating: 0,
          comment: 'Poor product',
        })
      ).rejects.toThrow('Rating must be an integer between 1 and 5');

      await expect(
        ReviewService.createOrUpdateReview({
          productId: 'prod-1',
          customerId: 'cust-1',
          rating: 4.5,
          comment: 'Almost perfect',
        })
      ).rejects.toThrow('Rating must be an integer between 1 and 5');
    });

    it('should reject short comments', async () => {
      await expect(
        ReviewService.createOrUpdateReview({
          productId: 'prod-1',
          customerId: 'cust-1',
          rating: 5,
          comment: 'ok',
        })
      ).rejects.toThrow('Review comment must be at least 3 characters');
    });

    it('should grant Verified Buyer badge when customer holds active entitlement', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'prod-1' } as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue({
        id: 'ent-1',
        status: EntitlementStatus.ACTIVE,
      } as any);
      vi.mocked(prisma.review.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.review.create).mockResolvedValue({
        id: 'rev-1',
        productId: 'prod-1',
        customerId: 'cust-1',
        rating: 5,
        title: 'Outstanding!',
        comment: 'Really helped our team launch faster.',
        isVerifiedPurchase: true,
        isApproved: true,
      } as any);

      const review = await ReviewService.createOrUpdateReview({
        productId: 'prod-1',
        customerId: 'cust-1',
        rating: 5,
        title: 'Outstanding!',
        comment: 'Really helped our team launch faster.',
      });

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isVerifiedPurchase: true,
          rating: 5,
        }),
      });
      expect(review.isVerifiedPurchase).toBe(true);
    });

    it('should mark unverified when customer does not hold an active entitlement', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'prod-1' } as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.review.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.review.create).mockResolvedValue({
        id: 'rev-2',
        productId: 'prod-1',
        customerId: 'cust-2',
        rating: 4,
        comment: 'Looked at the demo and looks solid.',
        isVerifiedPurchase: false,
        isApproved: true,
      } as any);

      await ReviewService.createOrUpdateReview({
        productId: 'prod-1',
        customerId: 'cust-2',
        rating: 4,
        comment: 'Looked at the demo and looks solid.',
      });

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isVerifiedPurchase: false,
        }),
      });
    });

    it('should update existing review if customer has already reviewed the product', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'prod-1' } as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.review.findFirst).mockResolvedValue({
        id: 'existing-rev-id',
        rating: 3,
        comment: 'Initial thoughts',
      } as any);

      vi.mocked(prisma.review.update).mockResolvedValue({
        id: 'existing-rev-id',
        rating: 5,
        comment: 'Updated to 5 stars after the new release!',
      } as any);

      await ReviewService.createOrUpdateReview({
        productId: 'prod-1',
        customerId: 'cust-1',
        rating: 5,
        comment: 'Updated to 5 stars after the new release!',
      });

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'existing-rev-id' },
        data: expect.objectContaining({
          rating: 5,
          comment: 'Updated to 5 stars after the new release!',
        }),
      });
    });
  });

  describe('getProductReviews & Metrics', () => {
    it('should calculate average rating and star distribution correctly', async () => {
      vi.mocked(prisma.review.findMany)
        .mockResolvedValueOnce([
          {
            id: 'rev-1',
            productId: 'prod-1',
            rating: 5,
            title: 'Great',
            comment: 'Very good quality',
            isVerifiedPurchase: true,
            isApproved: true,
            createdAt: new Date(),
            customer: { id: 'c1', name: 'John Doe', email: 'john@nov.com' },
          },
          {
            id: 'rev-2',
            productId: 'prod-1',
            rating: 4,
            title: 'Good',
            comment: 'Nice product',
            isVerifiedPurchase: false,
            isApproved: true,
            createdAt: new Date(),
            customer: { id: 'c2', name: null, email: 'jane@nov.com' },
          },
        ] as any)
        .mockResolvedValueOnce([{ rating: 5 }, { rating: 4 }, { rating: 5 }, { rating: 5 }] as any);

      vi.mocked(prisma.review.count).mockResolvedValue(4);

      const result = await ReviewService.getProductReviews('prod-1', { page: 1, limit: 10 });

      expect(result.reviews.length).toBe(2);
      expect(result.reviews[1].customerName).toBe('jane'); // fallback to email username
      expect(result.metrics.totalReviews).toBe(4);
      // (5 + 4 + 5 + 5) / 4 = 19 / 4 = 4.75 -> rounded to 4.8
      expect(result.metrics.averageRating).toBe(4.8);
      expect(result.metrics.distribution[5]).toBe(3);
      expect(result.metrics.distribution[4]).toBe(1);
      expect(result.metrics.distributionPercentages[5]).toBe(75);
      expect(result.metrics.distributionPercentages[4]).toBe(25);
    });
  });

  describe('moderateReview', () => {
    it('should update review approval status and log audit trail', async () => {
      vi.mocked(prisma.review.update).mockResolvedValue({
        id: 'rev-1',
        isApproved: false,
      } as any);

      await ReviewService.moderateReview('rev-1', {
        isApproved: false,
        adminUserId: 'admin-1',
      });

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: { isApproved: false },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-1',
          action: 'REVIEW_REJECTED',
        }),
      });
    });
  });

  describe('deleteReview', () => {
    it('should allow author to delete their review', async () => {
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'rev-1',
        customerId: 'cust-1',
        productId: 'prod-1',
        rating: 5,
      } as any);

      const result = await ReviewService.deleteReview('rev-1', { userId: 'cust-1' });

      expect(result.success).toBe(true);
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev-1' } });
    });

    it('should allow admin to delete any review', async () => {
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'rev-1',
        customerId: 'cust-1',
        productId: 'prod-1',
        rating: 5,
      } as any);

      const result = await ReviewService.deleteReview('rev-1', {
        userId: 'admin-super',
        isAdmin: true,
      });

      expect(result.success).toBe(true);
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev-1' } });
    });

    it('should forbid non-author non-admin from deleting a review', async () => {
      vi.mocked(prisma.review.findUnique).mockResolvedValue({
        id: 'rev-1',
        customerId: 'cust-author',
        productId: 'prod-1',
        rating: 5,
      } as any);

      await expect(
        ReviewService.deleteReview('rev-1', { userId: 'intruder-id', isAdmin: false })
      ).rejects.toThrow('Unauthorized to delete this review');
    });
  });
});
