import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/payment/payment.service';
import { PaymentProviderType } from '@/services/payment/payment.interface';
import { OrderService } from '@/services/order/order.service';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = (searchParams.get('provider')?.toUpperCase() || 'FLUTTERWAVE') as PaymentProviderType;
    const orderId = searchParams.get('order_id');
    const txRef = searchParams.get('tx_ref') || searchParams.get('reference') || searchParams.get('trxref');
    const transactionId = searchParams.get('transaction_id');
    const statusParam = searchParams.get('status');

    // Paystack uses `reference`, Flutterwave uses `transaction_id` or `tx_ref`
    const verificationRef = provider === 'FLUTTERWAVE' ? (transactionId || txRef) : (txRef || transactionId);

    if (!verificationRef && !orderId) {
      return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/checkout?error=missing_verification_reference`);
    }

    // Attempt gateway verification
    let isVerified = false;
    let verifiedTransactionRef = txRef;

    if (verificationRef) {
      // In development or test environments, allow simulated test reference verification
      if (
        process.env.NODE_ENV !== 'production' &&
        typeof verificationRef === 'string' &&
        verificationRef.startsWith('test_simulated_')
      ) {
        isVerified = true;
      } else {
        try {
          const verifyResult = await PaymentService.verifyPaymentStatus({
            provider,
            reference: verificationRef,
          });
          isVerified = Boolean(verifyResult.success);
          if (verifyResult.transactionRef) {
            verifiedTransactionRef = verifyResult.transactionRef;
          }
        } catch (verifyErr) {
          console.error('Authoritative gateway payment verification failed:', verifyErr);
          isVerified = false;
        }
      }
    }

    // Find the target order
    let targetOrder = null;
    if (orderId) {
      targetOrder = await prisma.order.findUnique({ where: { id: orderId } });
    }
    if (!targetOrder && verifiedTransactionRef) {
      const tx = await prisma.transaction.findUnique({
        where: { transactionRef: verifiedTransactionRef },
        include: { order: true },
      });
      if (tx) targetOrder = tx.order;
    }

    if (!targetOrder) {
      return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/checkout?error=order_not_found`);
    }

    if (isVerified) {
      // Transition order to PAID (safe no-op if already transitioned by webhook)
      if (targetOrder.status !== OrderStatus.PAID) {
        await OrderService.transitionOrderStatus({
          orderId: targetOrder.id,
          toStatus: OrderStatus.PAID,
          paymentProvider: provider,
          transactionRef: verifiedTransactionRef || undefined,
          notes: `Verified via customer redirect callback (${provider})`,
        });
      }

      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${targetOrder.id}&orderNumber=${targetOrder.orderNumber}`
      );
    } else {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/checkout?error=payment_incomplete&order_id=${targetOrder.id}`
      );
    }
  } catch (error: any) {
    console.error('Payment verification redirect error:', error);
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/checkout?error=verification_exception`
    );
  }
}
