import { NextRequest, NextResponse } from 'next/server';
import { ReviewService } from '@/services/review/review.service';
import { SessionService } from '@/services/auth/session.service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reviewId } = await params;
    const session = await SessionService.getCurrentSession();

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN';

    const result = await ReviewService.deleteReview(reviewId, {
      userId: session.userId,
      isAdmin,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete review' },
      { status: 400 }
    );
  }
}
