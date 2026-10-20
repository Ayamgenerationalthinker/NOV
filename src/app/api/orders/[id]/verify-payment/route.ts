import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/services/payment/payment.service';
import { PaymentConfigurationError } from '@/services/payment/simulation';

export const dynamic = 'force-dynamic';

/**
 * The buyer's "Check again": re-asks the gateway about this order's latest payment attempts.
 * Nothing in the request can mark the order paid; only the gateway's answer can (via
 * PaymentService.confirmOrderPayment). Returns the order's status afterwards.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true, orderNumber: true } });
  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  if (order.status === 'PAID') {
    return NextResponse.json({ status: 'PAID', orderNumber: order.orderNumber });
  }

  try {
    const result = await PaymentService.recheckOrderPayment(order.id);
    const current = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });

    return NextResponse.json({
      status: current?.status ?? order.status,
      orderNumber: order.orderNumber,
      // PENDING: not finished yet; UNAVAILABLE: gateway unreachable, try later; FAILED: last attempt failed.
      payment:
        !result
          ? 'NONE'
          : result.outcome === 'PAID' || result.outcome === 'ALREADY_PAID'
            ? 'PAID'
            : result.reason === 'GATEWAY_ERROR'
              ? 'UNAVAILABLE'
              : result.outcome === 'PENDING'
                ? 'PENDING'
                : 'FAILED',
    });
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      console.error('Payment recheck blocked: gateway not configured.', error);
      return NextResponse.json({ status: order.status, orderNumber: order.orderNumber, payment: 'UNAVAILABLE' }, { status: 503 });
    }
    console.error('Payment recheck failed:', error);
    return NextResponse.json({ status: order.status, orderNumber: order.orderNumber, payment: 'UNAVAILABLE' }, { status: 502 });
  }
}
