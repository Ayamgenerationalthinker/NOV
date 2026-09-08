import { NextRequest, NextResponse } from 'next/server';
import { ReviewService } from '@/services/review/review.service';
import { SessionService } from '@/services/auth/session.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const moderationSchema = z.object({
  isApproved: z.boolean(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reviewId } = await params;
    const session = await SessionService.getCurrentSession();

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = moderationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid moderation data' }, { status: 400 });
    }

    const review = await ReviewService.moderateReview(reviewId, {
      isApproved: parsed.data.isApproved,
      adminUserId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Review ${parsed.data.isApproved ? 'approved' : 'hidden'} successfully.`,
      review,
    });
  } catch (error: any) {
    console.error('Review moderation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to moderate review' },
      { status: 500 }
    );
  }
}
