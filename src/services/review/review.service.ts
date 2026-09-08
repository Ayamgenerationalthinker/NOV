import { prisma } from '@/lib/prisma';
import { EntitlementStatus } from '@prisma/client';

export interface CreateReviewParams {
  productId: string;
  customerId: string;
  rating: number;
  title?: string;
  comment: string;
}

export interface ReviewFilterOptions {
  page?: number;
  limit?: number;
  onlyApproved?: boolean;
}

export class ReviewService {
  /**
   * Submit or update a product review
   */
  static async createOrUpdateReview({
    productId,
    customerId,
    rating,
    title,
    comment,
  }: CreateReviewParams) {
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    const trimmedComment = comment?.trim();
    if (!trimmedComment || trimmedComment.length < 3) {
      throw new Error('Review comment must be at least 3 characters.');
    }

    if (trimmedComment.length > 2000) {
      throw new Error('Review comment must not exceed 2000 characters.');
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found.`);
    }

    // Check if customer is a verified buyer
    const entitlement = await prisma.entitlement.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });

    const isVerifiedPurchase = Boolean(entitlement && entitlement.status === EntitlementStatus.ACTIVE);

    // Check if existing review exists
    const existingReview = await prisma.review.findFirst({
      where: { productId, customerId },
    });

    let review;
    if (existingReview) {
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating,
          title: title?.trim() || null,
          comment: trimmedComment,
          isVerifiedPurchase,
          isApproved: true, // Auto-approved by default
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: customerId,
          action: 'REVIEW_UPDATED',
          entityType: 'Review',
          entityId: review.id,
          oldValue: { rating: existingReview.rating },
          newValue: { rating, isVerifiedPurchase },
        },
      });
    } else {
      review = await prisma.review.create({
        data: {
          productId,
          customerId,
          rating,
          title: title?.trim() || null,
          comment: trimmedComment,
          isVerifiedPurchase,
          isApproved: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: customerId,
          action: 'REVIEW_CREATED',
          entityType: 'Review',
          entityId: review.id,
          newValue: { rating, isVerifiedPurchase, productId },
        },
      });
    }

    return review;
  }

  /**
   * Get all reviews and statistical rating distribution for a product
   */
  static async getProductReviews(
    productId: string,
    { page = 1, limit = 10, onlyApproved = true }: ReviewFilterOptions = {}
  ) {
    const whereClause: any = { productId };
    if (onlyApproved) {
      whereClause.isApproved = true;
    }

    const skip = (page - 1) * limit;

    const [reviews, totalCount, allRatings] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ isVerifiedPurchase: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.review.count({ where: whereClause }),
      prisma.review.findMany({
        where: whereClause,
        select: { rating: true },
      }),
    ]);

    // Calculate rating metrics
    const totalReviews = allRatings.length;
    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;

    for (const r of allRatings) {
      ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1;
      ratingSum += r.rating;
    }

    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0;

    const distributionPercentages = {
      5: totalReviews > 0 ? Math.round((ratingDistribution[5] / totalReviews) * 100) : 0,
      4: totalReviews > 0 ? Math.round((ratingDistribution[4] / totalReviews) * 100) : 0,
      3: totalReviews > 0 ? Math.round((ratingDistribution[3] / totalReviews) * 100) : 0,
      2: totalReviews > 0 ? Math.round((ratingDistribution[2] / totalReviews) * 100) : 0,
      1: totalReviews > 0 ? Math.round((ratingDistribution[1] / totalReviews) * 100) : 0,
    };

    return {
      reviews: reviews.map((rev) => ({
        id: rev.id,
        productId: rev.productId,
        rating: rev.rating,
        title: rev.title,
        comment: rev.comment,
        isVerifiedPurchase: rev.isVerifiedPurchase,
        isApproved: rev.isApproved,
        createdAt: rev.createdAt,
        customerName: rev.customer.name || rev.customer.email.split('@')[0],
      })),
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalReviews: totalCount,
      },
      metrics: {
        averageRating,
        totalReviews,
        distribution: ratingDistribution,
        distributionPercentages,
      },
    };
  }

  /**
   * Fast review summary for product cards and previews
   */
  static async getProductReviewSummary(productId: string) {
    const ratings = await prisma.review.findMany({
      where: { productId, isApproved: true },
      select: { rating: true },
    });

    const totalReviews = ratings.length;
    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return {
      averageRating: Number((sum / totalReviews).toFixed(1)),
      totalReviews,
    };
  }

  /**
   * Check whether a customer can review or has already reviewed a product
   */
  static async checkCustomerReviewStatus(productId: string, customerId?: string) {
    if (!customerId) {
      return { canReview: false, isVerifiedPurchase: false, existingReview: null };
    }

    const [existingReview, entitlement] = await Promise.all([
      prisma.review.findFirst({
        where: { productId, customerId },
      }),
      prisma.entitlement.findUnique({
        where: {
          customerId_productId: { customerId, productId },
        },
      }),
    ]);

    const isVerifiedPurchase = Boolean(entitlement && entitlement.status === EntitlementStatus.ACTIVE);

    return {
      canReview: true,
      isVerifiedPurchase,
      existingReview: existingReview || null,
    };
  }

  /**
   * Delete review by customer or admin
   */
  static async deleteReview(reviewId: string, { userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error(`Review ${reviewId} not found.`);
    }

    if (review.customerId !== userId && !isAdmin) {
      throw new Error('Unauthorized to delete this review.');
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REVIEW_DELETED',
        entityType: 'Review',
        entityId: reviewId,
        oldValue: { productId: review.productId, rating: review.rating },
      },
    });

    return { success: true, message: 'Review deleted successfully.' };
  }

  /**
   * Moderation pipeline for admin review approvals / rejections
   */
  static async moderateReview(
    reviewId: string,
    { isApproved, adminUserId }: { isApproved: boolean; adminUserId: string }
  ) {
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { isApproved },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: isApproved ? 'REVIEW_APPROVED' : 'REVIEW_REJECTED',
        entityType: 'Review',
        entityId: reviewId,
        newValue: { isApproved },
      },
    });

    return updated;
  }
}
