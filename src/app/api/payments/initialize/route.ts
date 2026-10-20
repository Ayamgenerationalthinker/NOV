import { NextRequest, NextResponse } from 'next/server';
import { OrderNotPayableError, PaymentService } from '@/services/payment/payment.service';
import { PaymentConfigurationError } from '@/services/payment/simulation';
import { SessionService } from '@/services/auth/session.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// The amount always comes from the stored order and the return address is always our own
// verify route, so neither is accepted from the browser.
const initializeSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  provider: z.enum(['FLUTTERWAVE', 'PAYSTACK']).default('PAYSTACK'),
});

/** Start a new payment attempt for an existing unpaid order (the buyer's "Try again"). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = initializeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payment initialization request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { orderId, provider } = parsed.data;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // A signed-in customer may only pay for their own order.
    const session = await SessionService.getCurrentSession();
    if (order.customerId && session && session.userId !== order.customerId && session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to pay for this order.' }, { status: 403 });
    }

    const result = await PaymentService.initializeOrderPayment({ orderId, provider });

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      transactionRef: result.transactionRef,
      provider: result.provider,
    });
  } catch (error) {
    if (error instanceof OrderNotPayableError) {
      return NextResponse.json({ error: error.message, status: 'NOT_PAYABLE' }, { status: 409 });
    }
    if (error instanceof PaymentConfigurationError) {
      console.error('Payment initialization blocked: gateway not configured.', error);
      return NextResponse.json({ error: 'Payments are not available right now. Please try again later.' }, { status: 503 });
    }
    console.error('Payment initialization failed:', error);
    return NextResponse.json({ error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }
}
