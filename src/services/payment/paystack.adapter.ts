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

export class PaystackAdapter implements IPaymentAdapter {
  readonly provider: PaymentProviderType = 'PAYSTACK';
  private secretKey: string | undefined;

  constructor() {
    this.secretKey = env.PAYSTACK_SECRET_KEY;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const txRef = `PSTK-${params.orderNumber}-${Date.now().toString().slice(-4)}`;

    // Simulated test gateway URL if secret key is not set
    if (!this.secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set, using simulated payment gateway URL');
      return {
        paymentUrl: `${env.NEXT_PUBLIC_APP_URL}/api/payments/verify?provider=PAYSTACK&reference=${txRef}&order_id=${params.orderId}`,
        transactionRef: txRef,
        provider: this.provider,
        rawResponse: { simulated: true },
      };
    }

    // Paystack amounts are in subunit (kobo / cents: amount * 100)
    const amountInSubunits = Math.round(params.amount * 100);

    const payload = {
      reference: txRef,
      amount: amountInSubunits,
      email: params.customerEmail,
      currency: params.currency,
      callback_url: params.callbackUrl,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        customerName: params.customerName,
        ...params.meta,
      },
    };

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      throw new Error(`Paystack initialization failed: ${data.message || 'Unknown error'}`);
    }

    return {
      paymentUrl: data.data.authorization_url,
      transactionRef: txRef,
      provider: this.provider,
      rawResponse: data,
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (!this.secretKey || reference.startsWith('PSTK-sim-')) {
      return {
        success: true,
        amount: 0,
        currency: 'USD',
        transactionRef: reference,
        providerRef: reference,
        status: 'SUCCESSFUL',
        rawPayload: { simulated: true },
      };
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      return {
        success: false,
        amount: 0,
        currency: 'USD',
        transactionRef: reference,
        status: 'FAILED',
        rawPayload: data,
      };
    }

    const tx = data.data;
    const isSuccessful = tx.status === 'success';

    return {
      success: isSuccessful,
      amount: tx.amount / 100, // Convert from subunits
      currency: tx.currency,
      transactionRef: tx.reference,
      providerRef: tx.id?.toString(),
      customerEmail: tx.customer?.email,
      paymentMethod: tx.channel,
      status: isSuccessful ? 'SUCCESSFUL' : tx.status === 'ongoing' ? 'PENDING' : 'FAILED',
      rawPayload: data,
    };
  }

  verifyWebhookSignature(headers: Headers, rawBody: string): boolean {
    const signature = headers.get('x-paystack-signature');
    if (!signature) return false;

    const secret = this.secretKey || env.PAYSTACK_WEBHOOK_SECRET || 'paystack-secret-dev';
    const computed = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computed, 'hex'));
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
        eventType: payload.event || 'charge.success',
        eventId: payload.id?.toString() || data.id?.toString(),
        transactionRef: data.reference || '',
        amount: Number((data.amount || 0) / 100),
        currency: data.currency || 'USD',
        customerEmail: data.customer?.email,
        isSuccessful: payload.event === 'charge.success' && data.status === 'success',
        rawPayload: payload,
      };
    } catch (err) {
      console.error('Failed to parse Paystack webhook payload:', err);
      return null;
    }
  }
}
