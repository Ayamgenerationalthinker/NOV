import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ShippingService } from '@/services/shipping/shipping.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const returnRequestSchema = z.object({
  orderId: z.string(),
  orderItemId: z.string(),
  reason: z.string().min(5),
  customerComment: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await RBACService.requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const isSeller = RBACService.isSellerOrAdmin(auth.session.role);
    const store = isSeller ? await prisma.store.findUnique({ where: { sellerId: auth.session.userId } }) : null;

    const where = isSeller
      ? (auth.session.role === 'ADMIN' ? {} : { storeId: store?.id })
      : { customerId: auth.session.userId };

    const returns = await prisma.returnRequest.findMany({
      where,
      include: {
        order: { select: { id: true, orderNumber: true } },
        orderItem: { include: { product: true, variant: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ returns });
  } catch (err: any) {
    console.error('Returns fetch error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch returns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await RBACService.requireAuth();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = returnRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid return request', details: parsed.error.flatten() }, { status: 400 });
    }

    const returnReq = await ShippingService.requestReturn({
      orderId: parsed.data.orderId,
      orderItemId: parsed.data.orderItemId,
      customerId: auth.session.userId,
      reason: parsed.data.reason,
      customerComment: parsed.data.customerComment,
    });

    return NextResponse.json({ success: true, returnRequest: returnReq });
  } catch (err: any) {
    console.error('Create return request error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create return request' }, { status: 500 });
  }
}
