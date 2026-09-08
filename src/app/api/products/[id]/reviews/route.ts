import { NextRequest, NextResponse } from 'next/server';
import { ReviewService } from '@/services/review/review.service';
import { SessionService } from '@/services/auth/session.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const reviewSubmissionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().min(3, 'Comment must be at least 3 characters').max(2000),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Resolve product by ID or Slug
    let product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      product = await prisma.product.findUnique({
        where: { slug: id },
        select: { id: true },
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const reviewsData = await ReviewService.getProductReviews(product.id, { page, limit });
    return NextResponse.json(reviewsData);
  } catch (error: any) {
    console.error('Fetch product reviews error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await SessionService.getCurrentSession();

    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a review.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = reviewSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid review submission data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Resolve product by ID or Slug
    let product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      product = await prisma.product.findUnique({
        where: { slug: id },
        select: { id: true },
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const review = await ReviewService.createOrUpdateReview({
      productId: product.id,
      customerId: session.userId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      comment: parsed.data.comment,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your review has been published.',
      review,
    });
  } catch (error: any) {
    console.error('Submit product review error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit review' },
      { status: 400 }
    );
  }
}
