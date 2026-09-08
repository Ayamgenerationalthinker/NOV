import { prisma } from '@/lib/prisma';
import { IPaymentAdapter, PaymentProviderType } from './payment.interface';
import { FlutterwaveAdapter } from './flutterwave.adapter';
import { PaystackAdapter } from './paystack.adapter';
import { TransactionStatus } from '@prisma/client';
import { env } from '@/lib/env';

export class PaymentService {
  private static adapters: Map<PaymentProviderType, IPaymentAdapter> = new Map<PaymentProviderType, IPaymentAdapter>([
    ['FLUTTERWAVE', new FlutterwaveAdapter()],
    ['PAYSTACK', new PaystackAdapter()],
  ]);

  static getAdapter(provider: PaymentProviderType): IPaymentAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported payment provider: ${provider}`);
    }
    return adapter;
  }

  /**
   * Initialize a payment gateway checkout session for an order
   */
  static async initializeOrderPayment({
    orderId,
    provider = 'FLUTTERWAVE',
    callbackUrl,
  }: {
    orderId: string;
    provider?: PaymentProviderType;
    callbackUrl?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const adapter = this.getAdapter(provider);
    const email = order.customer?.email || order.guestEmail;

    if (!email) {
      throw new Error('Customer email is required for payment initialization.');
    }

    const defaultCallback = `${env.NEXT_PUBLIC_APP_URL}/api/payments/verify?provider=${provider}&order_id=${order.id}`;
    const targetCallbackUrl = callbackUrl || defaultCallback;

    // Initialize with payment gateway
    const result = await adapter.initializePayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      currency: order.currency,
      customerEmail: email,
      customerName: order.customer?.name || order.guestName || undefined,
      callbackUrl: targetCallbackUrl,
    });

    // Record Transaction in database
    await prisma.transaction.create({
      data: {
        orderId: order.id,
        provider,
        transactionRef: result.transactionRef,
        amount: order.total,
        currency: order.currency,
        status: TransactionStatus.INITIALIZED,
        rawPayload: result.rawResponse || null,
      },
    });

    // Update order with selected provider
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentProvider: provider },
    });

    return result;
  }

  /**
   * Verify an order payment and update transaction records
   */
  static async verifyPaymentStatus({
    provider,
    reference,
  }: {
    provider: PaymentProviderType;
    reference: string;
  }) {
    const adapter = this.getAdapter(provider);
    const verification = await adapter.verifyPayment(reference);

    // Update transaction record if exists
    const transaction = await prisma.transaction.findUnique({
      where: { transactionRef: verification.transactionRef || reference },
    });

    if (transaction) {
      const newStatus = verification.success
        ? TransactionStatus.SUCCESSFUL
        : verification.status === 'PENDING'
        ? TransactionStatus.PENDING
        : TransactionStatus.FAILED;

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          providerRef: verification.providerRef || transaction.providerRef,
          paymentMethod: verification.paymentMethod || transaction.paymentMethod,
          rawPayload: verification.rawPayload || transaction.rawPayload,
        },
      });
    }

    return verification;
  }
}
