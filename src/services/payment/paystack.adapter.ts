import {
  IPaymentAdapter,
  PaymentAdapterConfig,
  PaymentProviderType,
  InitializePaymentParams,
  InitializePaymentResult,
  VerifyPaymentResult,
  WebhookEventPayload,
} from './payment.interface';
import { isPaymentSimulationEnabled, PaymentConfigurationError } from './simulation';
import { env } from '@/lib/env';
import crypto from 'crypto';

export const PAYSTACK_SIMULATED_PREFIX = 'PSTK-sim-';

export class PaystackAdapter implements IPaymentAdapter {
  readonly provider: PaymentProviderType = 'PAYSTACK';
  private secretKey: string | undefined;

  constructor(config: PaymentAdapterConfig = {}) {
    this.secretKey = 'secretKey' in config ? config.secretKey : env.PAYSTACK_SECRET_KEY;
  }

  /** Simulation is used only when explicitly enabled outside production and no real key is set. */
  private useSimulation(): boolean {
    return !this.secretKey && isPaymentSimulationEnabled();
  }

  private requireSecretKey(): string {
    if (!this.secretKey) {
      throw new PaymentConfigurationError(
        'PAYSTACK_SECRET_KEY is not configured. Paystack payments cannot be processed.'
      );
    }
    return this.secretKey;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const suffix = crypto.randomBytes(4).toString('hex');

    if (this.useSimulation()) {
      const txRef = `${PAYSTACK_SIMULATED_PREFIX}${params.orderNumber}-${suffix}`;
      console.warn('⚠️ PAYMENT_SIMULATION enabled: using simulated Paystack checkout');
      return {
        paymentUrl: `${env.NEXT_PUBLIC_APP_URL}/api/payments/verify?provider=PAYSTACK&reference=${encodeURIComponent(txRef)}&order_id=${params.orderId}`,
        transactionRef: txRef,
        provider: this.provider,
        rawResponse: { simulated: true },
      };
    }

    const secretKey = this.requireSecretKey();
    const txRef = `PSTK-${params.orderNumber}-${suffix}`;

    // Paystack amounts are in subunits (pesewas / kobo / cents: amount * 100)
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
        Authorization: `Bearer ${secretKey}`,
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
    if (this.useSimulation()) {
      const isSimulatedRef = reference.startsWith(PAYSTACK_SIMULATED_PREFIX);
      return {
        success: isSimulatedRef,
        amount: NaN, // filled from the stored Transaction by PaymentService in simulation mode
        currency: '',
        transactionRef: reference,
        providerRef: isSimulatedRef ? reference : undefined,
        status: isSimulatedRef ? 'SUCCESSFUL' : 'FAILED',
        rawPayload: { simulated: true },
        simulated: isSimulatedRef,
      };
    }

    const secretKey = this.requireSecretKey();

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok || !data.status || !data.data) {
      return {
        success: false,
        amount: 0,
        currency: '',
        transactionRef: reference,
        status: 'FAILED',
        rawPayload: data,
      };
    }

    const tx = data.data;
    const isSuccessful = tx.status === 'success';

    return {
      success: isSuccessful,
      amount: Number(tx.amount) / 100, // Convert from subunits
      currency: String(tx.currency || '').toUpperCase(),
      transactionRef: tx.reference,
      providerRef: tx.id?.toString(),
      customerEmail: tx.customer?.email,
      paymentMethod: tx.channel,
      status: isSuccessful ? 'SUCCESSFUL' : tx.status === 'ongoing' || tx.status === 'pending' ? 'PENDING' : 'FAILED',
      rawPayload: data,
    };
  }

  /**
   * Paystack signs webhooks with HMAC-SHA512 of the raw body using the account secret key.
   * No key configured means no webhook can be trusted.
   */
  verifyWebhookSignature(headers: Headers, rawBody: string): boolean {
    const signature = headers.get('x-paystack-signature');
    if (!signature || !this.secretKey) return false;

    const computed = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(computed, 'hex');

    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
  }

  parseWebhookEvent(rawBody: string): WebhookEventPayload | null {
    try {
      const payload = JSON.parse(rawBody);
      const data = payload.data || payload;

      const eventType = payload.event || 'unknown';
      const objectId = data.id?.toString() || payload.id?.toString();

      return {
        provider: this.provider,
        eventType,
        // Paystack events have no own id; key idempotency on event type + transaction id.
        eventId: objectId ? `${eventType}:${objectId}` : undefined,
        transactionRef: data.reference || '',
        amount: Number((data.amount || 0) / 100),
        currency: String(data.currency || '').toUpperCase(),
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
