export type PaymentProviderType = 'FLUTTERWAVE' | 'PAYSTACK';

export interface InitializePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  callbackUrl: string;
  meta?: Record<string, any>;
}

export interface InitializePaymentResult {
  paymentUrl: string;
  transactionRef: string;
  provider: PaymentProviderType;
  rawResponse?: any;
}

export interface VerifyPaymentResult {
  success: boolean;
  amount: number;
  currency: string;
  transactionRef: string;
  providerRef?: string;
  customerEmail?: string;
  paymentMethod?: string;
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  rawPayload?: any;
  /** True only for local simulated payments (never in production). */
  simulated?: boolean;
}

export interface PaymentAdapterConfig {
  secretKey?: string;
  webhookSecret?: string;
}

export interface WebhookEventPayload {
  provider: PaymentProviderType;
  eventType: string;
  eventId?: string;
  transactionRef: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  isSuccessful: boolean;
  rawPayload: any;
}

export interface IPaymentAdapter {
  readonly provider: PaymentProviderType;

  initializePayment(params: InitializePaymentParams): Promise<InitializePaymentResult>;

  /**
   * Ask the gateway for the authoritative status of a payment.
   * `reference` is always NOV's own transactionRef (as stored on the Transaction row).
   * Throws PaymentConfigurationError when the gateway is not configured.
   */
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;

  verifyWebhookSignature(headers: Headers, rawBody: string): boolean;

  parseWebhookEvent(rawBody: string): WebhookEventPayload | null;
}
