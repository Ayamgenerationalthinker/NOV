import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { TestimonialService } from '@/services/testimonial/testimonial.service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const publishSchema = z.object({ isPublished: z.boolean() });

async function requireAdmin() {
  const session = await SessionService.getCurrentSession();
  return Boolean(session && RBACService.isAdmin(session.role));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
    }

    const parsed = publishSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const { id } = await params;
    const testimonial = await TestimonialService.setPublished(id, parsed.data.isPublished);
    return NextResponse.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Error updating story:', error);
    return NextResponse.json({ error: 'Failed to update story.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    await TestimonialService.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json({ error: 'Failed to delete story.' }, { status: 500 });
  }
}
