import { NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { EntitlementService } from '@/services/entitlement/entitlement.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await SessionService.getCurrentSession();

  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const library = await EntitlementService.getCustomerLibrary(session.userId);
    return NextResponse.json({ items: library });
  } catch (error) {
    console.error('Failed to get customer library:', error);
    return NextResponse.json({ error: 'Failed to retrieve your digital library.' }, { status: 500 });
  }
}
