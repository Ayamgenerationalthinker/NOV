import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/payment.service';
import { PaymentProviderType } from '@/services/payment/payment.interface';
import { SessionService } from '@/services/auth/session.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const initializeSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  provider: z.enum(['FLUTTERWAVE', 'PAYSTACK']).default('FLUTTERWAVE'),
  callbackUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = initializeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payment initialization request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orderId, provider, callbackUrl } = parsed.data;

    // Verify order exists and is in PENDING state
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'PAID') {
      return NextResponse.json(
        { error: 'This order has already been paid.' },
        { status: 400 }
      );
    }

    // Optional auth check: if order has a customerId, verify current session matches
    const session = await SessionService.getCurrentSession();
    if (order.customerId && session && session.userId !== order.customerId && session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to pay for this order.' }, { status: 403 });
    }

    const result = await PaymentService.initializeOrderPayment({
      orderId,
      provider: provider as PaymentProviderType,
      callbackUrl,
    });

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      transactionRef: result.transactionRef,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('Payment initialization failed:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize payment gateway session.' },
      { status: 500 }
    );
  }
}
