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

/**
 * Currencies this store will charge through Paystack, with how many subunits make one unit
 * (pesewas, kobo, cents). Paystack takes and returns amounts in subunits. Only currencies whose
 * subunit is confirmed are listed: anything else is refused instead of being guessed.
 */
export const PAYSTACK_SUBUNITS: Record<string, number> = {
  GHS: 100,
  NGN: 100,
  USD: 100,
  ZAR: 100,
  KES: 100,
};

export function paystackSubunitFactor(currency: string): number {
  const factor = PAYSTACK_SUBUNITS[currency.toUpperCase()];
  if (!factor) {
    throw new PaymentConfigurationError(`Paystack payments in ${currency} are not supported by this store.`);
  }
  return factor;
}

/** Major units (e.g. 150.50 GHS) to Paystack subunits (15050), rounded to a whole subunit. */
export function toPaystackSubunits(amount: number, currency: string): number {
  return Math.round(amount * paystackSubunitFactor(currency));
}

export function fromPaystackSubunits(subunits: number, currency: string): number {
  const factor = PAYSTACK_SUBUNITS[currency.toUpperCase()];
  // An unknown currency can never match an order, so NaN makes the amount check fail safely.
  return factor ? Number(subunits) / factor : NaN;
}

/** Thrown when Paystack could not be reached or answered with a server error; safe to retry later. */
export class PaymentGatewayUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayUnavailableError';
  }
}

/**
 * Paystack transaction statuses. Only "success" is paid and only "failed"/"reversed" are final
 * failures. "abandoned" means the buyer has not finished (or closed the window); they may still
 * pay with the same reference, so it is treated as pending rather than failed.
 */
function mapPaystackStatus(status: unknown): VerifyPaymentResult['status'] {
  if (status === 'success') return 'SUCCESSFUL';
  if (status === 'failed' || status === 'reversed') return 'FAILED';
  return 'PENDING';
}

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

    const amountInSubunits = toPaystackSubunits(params.amount, params.currency);

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

    let res: Response;
    let data: any;
    try {
      res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      data = await res.json();
    } catch (err) {
      throw new PaymentGatewayUnavailableError(`Could not reach Paystack: ${(err as Error).message}`);
    }

    // A server error or rate limit says nothing about the payment: never record it as a failure.
    if (res.status === 429 || res.status >= 500) {
      throw new PaymentGatewayUnavailableError(`Paystack answered ${res.status} while verifying ${reference}.`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new PaymentConfigurationError('Paystack rejected the configured secret key.');
    }

    if (!res.ok || !data?.status || !data?.data) {
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
    const status = mapPaystackStatus(tx.status);
    const currency = String(tx.currency || '').toUpperCase();

    return {
      success: status === 'SUCCESSFUL',
      amount: fromPaystackSubunits(Number(tx.amount), currency),
      currency,
      transactionRef: tx.reference,
      providerRef: tx.id?.toString(),
      customerEmail: tx.customer?.email,
      paymentMethod: tx.channel,
      status,
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
        amount: fromPaystackSubunits(Number(data.amount || 0), String(data.currency || '')),
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
