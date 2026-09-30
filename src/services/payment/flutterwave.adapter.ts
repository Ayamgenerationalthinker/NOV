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

export const FLUTTERWAVE_SIMULATED_PREFIX = 'FLW-sim-';

export class FlutterwaveAdapter implements IPaymentAdapter {
  readonly provider: PaymentProviderType = 'FLUTTERWAVE';
  private secretKey: string | undefined;
  private secretHash: string | undefined;

  constructor(config: PaymentAdapterConfig = {}) {
    this.secretKey = 'secretKey' in config ? config.secretKey : env.FLUTTERWAVE_SECRET_KEY;
    this.secretHash = 'webhookSecret' in config ? config.webhookSecret : env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;
  }

  /** Simulation is used only when explicitly enabled outside production and no real key is set. */
  private useSimulation(): boolean {
    return !this.secretKey && isPaymentSimulationEnabled();
  }

  private requireSecretKey(): string {
    if (!this.secretKey) {
      throw new PaymentConfigurationError(
        'FLUTTERWAVE_SECRET_KEY is not configured. Flutterwave payments cannot be processed.'
      );
    }
    return this.secretKey;
  }

  async initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult> {
    const suffix = crypto.randomBytes(4).toString('hex');

    if (this.useSimulation()) {
      const txRef = `${FLUTTERWAVE_SIMULATED_PREFIX}${params.orderNumber}-${suffix}`;
      console.warn('⚠️ PAYMENT_SIMULATION enabled: using simulated Flutterwave checkout');
      return {
        paymentUrl: `${env.NEXT_PUBLIC_APP_URL}/api/payments/verify?provider=FLUTTERWAVE&status=successful&tx_ref=${encodeURIComponent(txRef)}&order_id=${params.orderId}`,
        transactionRef: txRef,
        provider: this.provider,
        rawResponse: { simulated: true },
      };
    }

    const secretKey = this.requireSecretKey();
    const txRef = `FLW-${params.orderNumber}-${suffix}`;

    const payload = {
      tx_ref: txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.callbackUrl,
      customer: {
        email: params.customerEmail,
        name: params.customerName || 'Customer',
      },
      customizations: {
        title: env.NEXT_PUBLIC_APP_NAME,
        description: `Payment for Order #${params.orderNumber}`,
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
        Authorization: `Bearer ${secretKey}`,
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

  /**
   * Verify by NOV's own tx_ref (not the transaction_id from the redirect URL, which the
   * customer controls), so the gateway answer is always about the transaction we created.
   */
  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    if (this.useSimulation()) {
      const isSimulatedRef = reference.startsWith(FLUTTERWAVE_SIMULATED_PREFIX);
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

    const res = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await res.json();

    if (!res.ok || data.status !== 'success' || !data.data) {
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
    const isSuccessful = tx.status === 'successful';

    return {
      success: isSuccessful,
      amount: Number(tx.amount),
      currency: String(tx.currency || '').toUpperCase(),
      transactionRef: tx.tx_ref,
      providerRef: tx.id?.toString(),
      customerEmail: tx.customer?.email,
      paymentMethod: tx.payment_type,
      status: isSuccessful ? 'SUCCESSFUL' : tx.status === 'pending' ? 'PENDING' : 'FAILED',
      rawPayload: data,
    };
  }

  /**
   * Flutterwave sends the dashboard "secret hash" verbatim in the verif-hash header.
   * No hash configured means no webhook can be trusted.
   */
  verifyWebhookSignature(headers: Headers, _rawBody: string): boolean {
    const signature = headers.get('verif-hash');
    if (!signature || !this.secretHash) return false;

    const provided = Buffer.from(signature);
    const expected = Buffer.from(this.secretHash);
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
  }

  parseWebhookEvent(rawBody: string): WebhookEventPayload | null {
    try {
      const payload = JSON.parse(rawBody);
      const data = payload.data || payload;
      const eventType = payload.event || payload['event.type'] || 'unknown';
      const objectId = data.id?.toString() || payload.id?.toString();

      return {
        provider: this.provider,
        eventType,
        eventId: objectId ? `${eventType}:${objectId}` : undefined,
        transactionRef: data.tx_ref || data.txRef || '',
        amount: Number(data.amount || 0),
        currency: String(data.currency || '').toUpperCase(),
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
