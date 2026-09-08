import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order/order.service';
import { SessionService } from '@/services/auth/session.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string() })).min(1, 'At least one item is required'),
  guestEmail: z.string().email().optional(),
  guestName: z.string().min(2).optional(),
  couponCode: z.string().optional(),
  currency: z.string().default('USD'),
  customerNotes: z.string().max(500).optional(),
  paymentProvider: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid checkout request data', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items, guestEmail, guestName, couponCode, currency, customerNotes, paymentProvider } = parsed.data;

    // Check if user is logged in
    const session = await SessionService.getCurrentSession();
    const customerId = session?.userId;

    if (!customerId && !guestEmail) {
      return NextResponse.json(
        { error: 'Email address is required to create a checkout session.' },
        { status: 400 }
      );
    }

    const order = await OrderService.createOrder({
      customerId,
      guestEmail,
      guestName,
      items,
      couponCode,
      currency,
      customerNotes,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      currency: order.currency,
      status: order.status,
      paymentProvider: paymentProvider || 'CARD',
      message: 'Checkout session created successfully.',
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to initialize checkout session.' },
      { status: 500 }
    );
  }
}
