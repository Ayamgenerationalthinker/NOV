import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { TestimonialService } from '@/services/testimonial/testimonial.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await SessionService.getCurrentSession();
    if (!session || !RBACService.isAdmin(session.role)) {
      return NextResponse.json({ error: 'Unauthorized. Admin privileges required.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: await TestimonialService.getAll() });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Failed to load stories.' }, { status: 500 });
  }
}
