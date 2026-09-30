import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ShippingService } from '@/services/shipping/shipping.service';
import { FulfillmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const fulfillmentSchema = z.object({
  orderId: z.string(),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
  trackingUrl: z.string().optional(),
  status: z.nativeEnum(FulfillmentStatus).default(FulfillmentStatus.FULFILLED),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const store = await prisma.store.findUnique({ where: { sellerId: auth.session.userId } });
    const storeId = auth.session.role === 'ADMIN' || auth.session.role === 'SUPER_ADMIN' ? undefined : store?.id;

    const fulfillments = await prisma.fulfillment.findMany({
      where: storeId ? { storeId } : {},
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, shippingAddress: true },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ fulfillments });
  } catch (err: any) {
    console.error('Fulfillments error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch fulfillments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = fulfillmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fulfillment payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { sellerId: auth.session.userId } });

    const fulfillment = await ShippingService.createOrUpdateFulfillment({
      orderId: parsed.data.orderId,
      storeId: store?.id,
      trackingNumber: parsed.data.trackingNumber,
      trackingCarrier: parsed.data.trackingCarrier,
      trackingUrl: parsed.data.trackingUrl,
      status: parsed.data.status,
      notes: parsed.data.notes,
    });

    return NextResponse.json({ success: true, fulfillment });
  } catch (err: any) {
    console.error('Create fulfillment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process fulfillment' }, { status: 500 });
  }
}
