import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { StoreService } from '@/services/store/store.service';
import { z } from 'zod';

const storeSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  policyShipping: z.string().optional(),
  policyReturns: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const store = await StoreService.getStoreBySellerId(auth.session.userId);
    return NextResponse.json({ store });
  } catch (err: any) {
    console.error('Store profile error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch store' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = storeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid store profile', details: parsed.error.flatten() }, { status: 400 });
    }

    const store = await StoreService.upsertStore({
      sellerId: auth.session.userId,
      ...parsed.data,
    });

    return NextResponse.json({ success: true, store });
  } catch (err: any) {
    console.error('Update store error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update store' }, { status: 500 });
  }
}
