import { NextRequest, NextResponse } from 'next/server';
import { SessionService } from '@/services/auth/session.service';
import { EmailService } from '@/services/email/email.service';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;
    const session = await SessionService.getCurrentSession();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Auth check: user must be admin, or the customer who placed the order
    const isAdmin = session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN';
    const isOwner = session && order.customerId && session.userId === order.customerId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized to resend this receipt' }, { status: 403 });
    }

    const dispatched = await EmailService.sendOrderReceiptEmail(order.id);

    if (!dispatched) {
      return NextResponse.json(
        { error: 'Failed to dispatch email. Please check server configuration.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Digital receipt for order #${order.orderNumber} has been dispatched to ${order.customer?.email || order.guestEmail}.`,
    });
  } catch (error: any) {
    console.error('Resend receipt error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resend receipt' },
      { status: 500 }
    );
  }
}
