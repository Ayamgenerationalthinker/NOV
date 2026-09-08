import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order/order.service';
import { SessionService } from '@/services/auth/session.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await OrderService.getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Security check: if customer is logged in, ensure they own the order (unless admin)
    const session = await SessionService.getCurrentSession();
    if (session && order.customerId && session.role === 'CUSTOMER' && order.customerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        discountTotal: Number(order.discountTotal),
        taxTotal: Number(order.taxTotal),
        total: Number(order.total),
        currency: order.currency,
        paymentProvider: order.paymentProvider,
        guestEmail: order.guestEmail,
        guestName: order.guestName,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
          id: i.id,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
          product: {
            id: i.product.id,
            title: i.product.title,
            slug: i.product.slug,
            coverImage: i.product.coverImage,
            productType: i.product.productType,
            files: i.product.files.map((f) => ({
              id: f.id,
              fileName: f.fileName,
              fileSize: Number(f.fileSize),
              versionNumber: f.versionNumber,
            })),
          },
        })),
      },
    });
  } catch (error) {
    console.error('Order query error:', error);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}
