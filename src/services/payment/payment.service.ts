import { prisma } from '@/lib/prisma';
import { IPaymentAdapter, PaymentProviderType } from './payment.interface';
import { FlutterwaveAdapter } from './flutterwave.adapter';
import { PaystackAdapter } from './paystack.adapter';
import { isPaymentSimulationEnabled, PaymentConfigurationError } from './simulation';
import { OrderService } from '@/services/order/order.service';
import { OrderStatus, TransactionStatus } from '@prisma/client';
import { env } from '@/lib/env';

export type PaymentConfirmationOutcome = 'PAID' | 'ALREADY_PAID' | 'PENDING' | 'FAILED' | 'REJECTED';

export type PaymentRejectionReason =
  | 'UNKNOWN_REFERENCE'
  | 'PROVIDER_MISMATCH'
  | 'ORDER_MISMATCH'
  | 'ORDER_NOT_PAYABLE'
  | 'REFERENCE_MISMATCH'
  | 'REFERENCE_REUSED'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'SIMULATION_NOT_ALLOWED'
  | 'GATEWAY_ERROR';

export interface PaymentConfirmationResult {
  outcome: PaymentConfirmationOutcome;
  reason?: PaymentRejectionReason;
  orderId?: string;
  orderNumber?: string;
  transactionRef: string;
  message: string;
}

export interface ConfirmOrderPaymentParams {
  /** NOV's own transaction reference (Transaction.transactionRef). */
  reference: string;
  /** When set, the stored Transaction must belong to this provider. */
  provider?: PaymentProviderType;
  /** When set (e.g. order_id from a redirect URL), the reference must belong to this order. */
  expectedOrderId?: string;
  source: 'redirect' | 'webhook';
}

/** Compare money in minor units to avoid floating-point drift. */
function toMinorUnits(amount: unknown): number {
  return Math.round(Number(amount) * 100);
}

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

  /** Test hook: swap an adapter (e.g. one constructed with explicit keys). */
  static setAdapter(provider: PaymentProviderType, adapter: IPaymentAdapter) {
    this.adapters.set(provider, adapter);
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

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.FAILED) {
      throw new Error(`Order ${order.orderNumber} cannot be paid (status: ${order.status}).`);
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

    // Record Transaction in database: this row is what every later confirmation is checked against
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
   * The ONLY path that may mark an order PAID after an online payment (redirect and webhook).
   * An order becomes PAID only when all of these hold:
   *  1. the reference matches a Transaction we created (and, if given, for the expected order/provider),
   *  2. the gateway itself confirms the payment succeeded for that exact reference,
   *  3. the gateway's provider-side transaction id is not already attached to a different order,
   *  4. the paid amount and currency match both the stored Transaction and the order total.
   */
  static async confirmOrderPayment({
    reference,
    provider,
    expectedOrderId,
    source,
  }: ConfirmOrderPaymentParams): Promise<PaymentConfirmationResult> {
    const reject = async (
      reason: PaymentRejectionReason,
      message: string,
      context: { orderId?: string; orderNumber?: string; transactionId?: string } = {}
    ): Promise<PaymentConfirmationResult> => {
      console.error(`🚫 Payment confirmation rejected (${reason}) for ref ${reference} via ${source}: ${message}`);
      if (context.transactionId) {
        await prisma.transaction.update({
          where: { id: context.transactionId },
          data: { status: TransactionStatus.FAILED, errorMessage: `${reason}: ${message}` },
        });
      }
      try {
        await prisma.auditLog.create({
          data: {
            action: 'PAYMENT_REJECTED',
            entityType: 'Transaction',
            entityId: context.transactionId || reference,
            newValue: { reason, message, reference, source, expectedOrderId: expectedOrderId || null },
          },
        });
      } catch (err) {
        console.error('Failed to write payment rejection audit log:', err);
      }
      return {
        outcome: 'REJECTED',
        reason,
        orderId: context.orderId,
        orderNumber: context.orderNumber,
        transactionRef: reference,
        message,
      };
    };

    if (!reference) {
      return reject('UNKNOWN_REFERENCE', 'No payment reference supplied.');
    }

    // 1. The reference must be one we issued, for the expected order and provider
    const transaction = await prisma.transaction.findUnique({
      where: { transactionRef: reference },
      include: { order: true },
    });

    if (!transaction || !transaction.order) {
      return reject('UNKNOWN_REFERENCE', 'Reference does not match any transaction created by this store.');
    }

    const order = transaction.order;
    const context = { orderId: order.id, orderNumber: order.orderNumber };

    if (provider && transaction.provider !== provider) {
      return reject('PROVIDER_MISMATCH', `Transaction was created with ${transaction.provider}, not ${provider}.`, context);
    }

    if (expectedOrderId && transaction.orderId !== expectedOrderId) {
      return reject('ORDER_MISMATCH', `Reference belongs to a different order than ${expectedOrderId}.`, context);
    }

    if (order.status === OrderStatus.PAID) {
      return {
        outcome: 'ALREADY_PAID',
        ...context,
        transactionRef: reference,
        message: 'Order is already paid.',
      };
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.FAILED) {
      return reject('ORDER_NOT_PAYABLE', `Order is ${order.status} and cannot be marked paid.`, context);
    }

    // 2. Authoritative gateway verification. Configuration errors propagate (fail loudly).
    const adapter = this.getAdapter(transaction.provider as PaymentProviderType);
    let verification;
    try {
      verification = await adapter.verifyPayment(reference);
    } catch (err) {
      if (err instanceof PaymentConfigurationError) throw err;
      console.error(`Gateway verification error for ${reference}:`, err);
      return reject('GATEWAY_ERROR', 'Could not reach the payment gateway to verify this payment.', context);
    }

    let verifiedAmount = verification.amount;
    let verifiedCurrency = verification.currency;

    if (verification.simulated) {
      // Defence in depth: adapters only simulate when allowed, but never trust that alone.
      if (!isPaymentSimulationEnabled()) {
        return reject('SIMULATION_NOT_ALLOWED', 'Simulated payments are disabled.', {
          ...context,
          transactionId: transaction.id,
        });
      }
      verifiedAmount = Number(transaction.amount);
      verifiedCurrency = transaction.currency;
    }

    if (verification.transactionRef !== reference) {
      return reject(
        'REFERENCE_MISMATCH',
        `Gateway returned reference ${verification.transactionRef || '(none)'} instead of ${reference}.`,
        { ...context, transactionId: transaction.id }
      );
    }

    if (!verification.success) {
      if (transaction.status !== TransactionStatus.SUCCESSFUL) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: verification.status === 'PENDING' ? TransactionStatus.PENDING : TransactionStatus.FAILED,
            providerRef: verification.providerRef || transaction.providerRef,
            rawPayload: verification.rawPayload ?? undefined,
          },
        });
      }
      return {
        outcome: verification.status === 'PENDING' ? 'PENDING' : 'FAILED',
        ...context,
        transactionRef: reference,
        message: verification.status === 'PENDING' ? 'Payment is still pending.' : 'Payment was not successful.',
      };
    }

    // 3. The gateway transaction must not already be attached to another order
    if (verification.providerRef) {
      const reused = await prisma.transaction.findFirst({
        where: {
          provider: transaction.provider,
          providerRef: verification.providerRef,
          id: { not: transaction.id },
        },
      });
      if (reused && reused.orderId !== transaction.orderId) {
        return reject('REFERENCE_REUSED', `Gateway transaction ${verification.providerRef} is already used by another order.`, {
          ...context,
          transactionId: transaction.id,
        });
      }
    }

    // 4. Amount and currency must match what we charged
    const orderTotalMinor = toMinorUnits(order.total);
    if (toMinorUnits(verifiedAmount) !== orderTotalMinor || toMinorUnits(transaction.amount) !== orderTotalMinor) {
      return reject(
        'AMOUNT_MISMATCH',
        `Paid ${verifiedAmount} but order total is ${Number(order.total)}.`,
        { ...context, transactionId: transaction.id }
      );
    }

    const orderCurrency = order.currency.toUpperCase();
    if (
      String(verifiedCurrency || '').toUpperCase() !== orderCurrency ||
      transaction.currency.toUpperCase() !== orderCurrency
    ) {
      return reject(
        'CURRENCY_MISMATCH',
        `Paid in ${verifiedCurrency || '(unknown)'} but order currency is ${order.currency}.`,
        { ...context, transactionId: transaction.id }
      );
    }

    // All checks passed
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.SUCCESSFUL,
        providerRef: verification.providerRef || transaction.providerRef,
        paymentMethod: verification.paymentMethod || transaction.paymentMethod,
        rawPayload: verification.rawPayload ?? undefined,
        errorMessage: null,
      },
    });

    await OrderService.transitionOrderStatus({
      orderId: order.id,
      toStatus: OrderStatus.PAID,
      paymentProvider: transaction.provider,
      transactionRef: reference,
      notes: `Payment verified with ${transaction.provider} (${source})`,
    });

    return {
      outcome: 'PAID',
      ...context,
      transactionRef: reference,
      message: 'Payment verified.',
    };
  }
}
