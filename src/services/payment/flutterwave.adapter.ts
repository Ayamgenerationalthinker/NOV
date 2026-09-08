import {
  IPaymentAdapter,
  PaymentProviderType,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
  WebhookEventPayload,
} from './payment.interface';
import { env } from '@/lib/env';
import crypto from 'crypto';

export class FlutterwaveAdapter implements IPaymentAdapter {
  readonly provider: PaymentProviderType = 'FLUTTERWAVE';
  private secretKey: string | undefined;
  private secretHash: string | undefined;

  constructor() {
    this.secretKey = env.FLUTTERWAVE_SECRET_KEY;
    this.secretHash = env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const txRef = `FLW-${params.orderNumber}-${Date.now().toString().slice(-4)}`;

    // If live Flutterwave secret key is not configured, generate a simulated dev checkout flow
    if (!this.secretKey) {
      console.warn('⚠️ FLUTTERWAVE_SECRET_KEY not set, using simulated payment gateway URL');
      return {
        paymentUrl: `${env.NEXT_PUBLIC_APP_URL}/api/payments/verify?provider=FLUTTERWAVE&status=successful&tx_ref=${txRef}&transaction_id=sim_${Date.now()}&order_id=${params.orderId}`,
        transactionRef: txRef,
        provider: this.provider,
        rawResponse: { simulated: true },
      };
    }

    const payload = {
      tx_ref: txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.callbackUrl,
      customer: {
        email: params.customerEmail,
        name: params.customerName || 'NOV Customer',
      },
      customizations: {
        title: 'NOV.com — Digital Asset Store',
        description: `Payment for Order #${params.orderNumber}`,
        logo: `${env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
      meta: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        ...params.meta,
      },
    };

    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      throw new Error(`Flutterwave initialization failed: ${data.message || 'Unknown error'}`);
    }

    return {
      paymentUrl: data.data.link,
      transactionRef: txRef,
      provider: this.provider,
      rawResponse: data,
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyPaymentResult> {
    // Simulated verification for local testing
    if (!this.secretKey || transactionId.startsWith('sim_')) {
      return {
        success: true,
        amount: 0,
        currency: 'USD',
        transactionRef: `FLW-sim-${transactionId}`,
        providerRef: transactionId,
        status: 'SUCCESSFUL',
        rawPayload: { simulated: true },
      };
    }

    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok || data.status !== 'success') {
      return {
        success: false,
        amount: 0,
        currency: 'USD',
        transactionRef: '',
        providerRef: transactionId,
        status: 'FAILED',
        rawPayload: data,
      };
    }

    const tx = data.data;
    const isSuccessful = tx.status === 'successful';

    return {
      success: isSuccessful,
      amount: tx.amount,
      currency: tx.currency,
      transactionRef: tx.tx_ref,
      providerRef: tx.id.toString(),
      customerEmail: tx.customer?.email,
      paymentMethod: tx.payment_type,
      status: isSuccessful ? 'SUCCESSFUL' : tx.status === 'pending' ? 'PENDING' : 'FAILED',
      rawPayload: data,
    };
  }

  verifyWebhookSignature(headers: Headers, _rawBody: string): boolean {
    const signature = headers.get('verif-hash');
    if (!signature) return false;

    const expectedHash = this.secretHash || 'flutterwave-secret-hash-dev';
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHash));
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string): WebhookEventPayload | null {
    try {
      const payload = JSON.parse(rawBody);
      const data = payload.data || payload;

      return {
        provider: this.provider,
        eventType: payload.event || payload['event.type'] || 'charge.completed',
        eventId: data.id?.toString() || payload.id?.toString(),
        transactionRef: data.tx_ref || data.txRef || '',
        amount: Number(data.amount || 0),
        currency: data.currency || 'USD',
        customerEmail: data.customer?.email,
        isSuccessful: data.status === 'successful',
        rawPayload: payload,
      };
    } catch (err) {
      console.error('Failed to parse Flutterwave webhook payload:', err);
      return null;
    }
  }
}
