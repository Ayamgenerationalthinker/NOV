import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/payment.service';
import { PaymentProviderType } from '@/services/payment/payment.interface';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

const PROVIDERS: PaymentProviderType[] = ['PAYSTACK', 'FLUTTERWAVE'];

/**
 * Customer redirect back from the gateway. Nothing in this URL is trusted: the reference is
 * looked up against our own Transaction rows and re-verified with the gateway by
 * PaymentService.confirmOrderPayment before any order is marked PAID.
 */
export async function GET(request: NextRequest) {
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const searchParams = request.nextUrl.searchParams;
  const providerParam = searchParams.get('provider')?.toUpperCase() as PaymentProviderType | undefined;
  const provider = providerParam && PROVIDERS.includes(providerParam) ? providerParam : undefined;
  const orderId = searchParams.get('order_id') || undefined;
  // Paystack returns `reference`/`trxref`; Flutterwave returns `tx_ref`. All are our own transactionRef.
  const reference = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('tx_ref');
  const gatewayStatus = searchParams.get('status')?.toLowerCase();

  const failureRedirect = (error: string, failedOrderId?: string) => {
    const url = new URL('/checkout', appUrl);
    url.searchParams.set('error', error);
    if (failedOrderId) url.searchParams.set('order_id', failedOrderId);
    return NextResponse.redirect(url);
  };

  if (!reference) {
    return failureRedirect(gatewayStatus === 'cancelled' ? 'payment_cancelled' : 'missing_verification_reference', orderId);
  }

  try {
    const result = await PaymentService.confirmOrderPayment({
      reference,
      provider,
      expectedOrderId: orderId,
      source: 'redirect',
    });

    if ((result.outcome === 'PAID' || result.outcome === 'ALREADY_PAID') && result.orderId) {
      const url = new URL('/checkout/success', appUrl);
      url.searchParams.set('orderId', result.orderId);
      if (result.orderNumber) url.searchParams.set('orderNumber', result.orderNumber);
      return NextResponse.redirect(url);
    }

    if (result.outcome === 'PENDING') {
      return failureRedirect('payment_pending', result.orderId);
    }

    if (result.outcome === 'FAILED') {
      return failureRedirect(gatewayStatus === 'cancelled' ? 'payment_cancelled' : 'payment_failed', result.orderId);
    }

    // REJECTED: don't reveal which check failed; it's logged and audited server-side.
    return failureRedirect('payment_verification_failed', orderId);
  } catch (error) {
    console.error('Payment verification redirect error:', error);
    return failureRedirect('verification_exception', orderId);
  }
}
