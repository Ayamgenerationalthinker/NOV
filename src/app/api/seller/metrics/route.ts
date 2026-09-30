import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { StoreService } from '@/services/store/store.service';

export async function GET(req: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const metrics = await StoreService.getSellerDashboardMetrics(auth.session.userId);
    return NextResponse.json(metrics);
  } catch (err: any) {
    console.error('Seller metrics error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch seller metrics' }, { status: 500 });
  }
}
