import { NextRequest, NextResponse } from 'next/server';
import { OrderService, OrderValidationError } from '@/services/order/order.service';
import { PaymentService } from '@/services/payment/payment.service';
import { PaymentConfigurationError } from '@/services/payment/simulation';
import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{8,19}$/;

const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(20).default(1),
});

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  street: z.string().trim().min(3, 'Enter your street, area and house number'),
  city: z.string().trim().min(2, 'Enter your city or town'),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().length(2).default('GH'),
  phone: z.string().trim().optional(),
  landmark: z.string().trim().max(200).optional(),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Your order is empty').max(20),
  guestName: z.string().trim().min(2, 'Enter your name').max(100),
  guestEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number, e.g. 024 123 4567'),
  couponCode: z.string().trim().max(50).optional(),
  shippingAddress: shippingAddressSchema.optional(),
  customerNotes: z.string().max(500).optional(),
  paymentProvider: z.enum(['PAYSTACK', 'FLUTTERWAVE']).default('PAYSTACK'),
});

/**
 * Guest checkout: creates the order (server-side prices and stock) and starts the payment.
 * Buyers never have accounts, so any session cookie (e.g. the owner testing) is ignored.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message || 'Please check your details.', field: firstIssue?.path.join('.') },
      { status: 400 }
    );
  }

  const { items, guestEmail, guestName, phone, couponCode, shippingAddress, customerNotes, paymentProvider } = parsed.data;

  try {
    const order = await OrderService.createOrder({
      guestEmail,
      guestName,
      contactPhone: phone,
      items,
      couponCode: couponCode || undefined,
      shippingAddress: shippingAddress
        ? {
            fullName: shippingAddress.fullName || guestName,
            street: shippingAddress.landmark ? `${shippingAddress.street} (near ${shippingAddress.landmark})` : shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country,
            phone: shippingAddress.phone || phone,
          }
        : undefined,
      customerNotes,
    });

    const orderTotal = Number(order.total);

    // Free order (e.g. 100% coupon or a free ebook)
    if (orderTotal === 0) {
      await OrderService.transitionOrderStatus({
        orderId: order.id,
        toStatus: OrderStatus.PAID,
        paymentProvider: 'FREE',
        notes: 'Free order',
      });

      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: 0,
        status: OrderStatus.PAID,
        paymentUrl: null,
      });
    }

    const paymentInit = await PaymentService.initializeOrderPayment({
      orderId: order.id,
      provider: paymentProvider,
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: orderTotal,
      currency: order.currency,
      status: order.status,
      paymentUrl: paymentInit.paymentUrl,
    });
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof PaymentConfigurationError) {
      console.error('Checkout blocked: payment gateway not configured.', error);
      return NextResponse.json(
        { error: 'Payments are not available right now. Please try again later.' },
        { status: 503 }
      );
    }
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Something went wrong starting your payment. Please try again.' },
      { status: 500 }
    );
  }
}
