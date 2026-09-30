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

export async function GET(_req: NextRequest) {
  // Single-owner store: only the owner manages returns.
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const returns = await prisma.returnRequest.findMany({
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
  // Customers have no accounts; the owner logs a return on the buyer's behalf.
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = returnRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid return request', details: parsed.error.flatten() }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: { customerId: true },
    });
    if (!order?.customerId) {
      return NextResponse.json({ error: 'Order not found or has no buyer record.' }, { status: 404 });
    }

    const returnReq = await ShippingService.requestReturn({
      orderId: parsed.data.orderId,
      orderItemId: parsed.data.orderItemId,
      customerId: order.customerId,
      reason: parsed.data.reason,
      customerComment: parsed.data.customerComment,
    });

    return NextResponse.json({ success: true, returnRequest: returnReq });
  } catch (err: any) {
    console.error('Create return request error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create return request' }, { status: 500 });
  }
}
