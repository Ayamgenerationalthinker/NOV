import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentService } from '@/services/payment/payment.service';
import { FlutterwaveAdapter } from '@/services/payment/flutterwave.adapter';
import { PaystackAdapter } from '@/services/payment/paystack.adapter';
import crypto from 'crypto';

describe('PaymentService & Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return FlutterwaveAdapter for FLUTTERWAVE', () => {
    const adapter = PaymentService.getAdapter('FLUTTERWAVE');
    expect(adapter).toBeInstanceOf(FlutterwaveAdapter);
    expect(adapter.provider).toBe('FLUTTERWAVE');
  });

  it('should return PaystackAdapter for PAYSTACK', () => {
    const adapter = PaymentService.getAdapter('PAYSTACK');
    expect(adapter).toBeInstanceOf(PaystackAdapter);
    expect(adapter.provider).toBe('PAYSTACK');
  });

  it('should throw error for unsupported provider', () => {
    expect(() => PaymentService.getAdapter('STRIPE' as any)).toThrow('Unsupported payment provider');
  });

  describe('FlutterwaveAdapter', () => {
    const adapter = new FlutterwaveAdapter({ secretKey: undefined, webhookSecret: 'flw-test-hash' });

    it('should initialize a simulated payment when PAYMENT_SIMULATION=true outside production', async () => {
      vi.stubEnv('PAYMENT_SIMULATION', 'true');
      const result = await adapter.initializePayment({
        orderId: 'order-123',
        orderNumber: 'NOV-100001-TEST',
        amount: 49.99,
        currency: 'GHS',
        customerEmail: 'customer@nov.com',
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      expect(result.provider).toBe('FLUTTERWAVE');
      expect(result.transactionRef).toContain('FLW-sim-NOV-100001-TEST');
      expect(result.paymentUrl).toContain('/api/payments/verify');
    });

    it('should accept the configured verif-hash and reject anything else', () => {
      expect(adapter.verifyWebhookSignature(new Headers({ 'verif-hash': 'flw-test-hash' }), '{}')).toBe(true);
      expect(adapter.verifyWebhookSignature(new Headers({ 'verif-hash': 'invalid-hash' }), '{}')).toBe(false);
    });

    it('should parse webhook event successfully', () => {
      const samplePayload = JSON.stringify({
        event: 'charge.completed',
        data: {
          id: 998877,
          tx_ref: 'FLW-NOV-123456',
          amount: 50,
          currency: 'GHS',
          status: 'successful',
          customer: { email: 'buyer@test.com' },
        },
      });

      const parsed = adapter.parseWebhookEvent(samplePayload);
      expect(parsed).not.toBeNull();
      expect(parsed?.provider).toBe('FLUTTERWAVE');
      expect(parsed?.eventType).toBe('charge.completed');
      expect(parsed?.eventId).toBe('charge.completed:998877');
      expect(parsed?.transactionRef).toBe('FLW-NOV-123456');
      expect(parsed?.amount).toBe(50);
      expect(parsed?.isSuccessful).toBe(true);
    });
  });

  describe('PaystackAdapter', () => {
    const secretKey = 'sk_test_unit';
    const adapter = new PaystackAdapter({ secretKey });

    it('should initialize a simulated payment when PAYMENT_SIMULATION=true outside production', async () => {
      vi.stubEnv('PAYMENT_SIMULATION', 'true');
      const simAdapter = new PaystackAdapter({ secretKey: undefined });
      const result = await simAdapter.initializePayment({
        orderId: 'order-456',
        orderNumber: 'NOV-200002-TEST',
        amount: 25.0,
        currency: 'GHS',
        customerEmail: 'paystack-buyer@nov.com',
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      expect(result.provider).toBe('PAYSTACK');
      expect(result.transactionRef).toContain('PSTK-sim-NOV-200002-TEST');
      expect(result.paymentUrl).toContain('/api/payments/verify');
    });

    it('should correctly verify valid HMAC-SHA512 signature made with the secret key', () => {
      const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } });
      const signature = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');

      const headers = new Headers({ 'x-paystack-signature': signature });
      expect(adapter.verifyWebhookSignature(headers, rawBody)).toBe(true);
    });

    it('should reject invalid HMAC-SHA512 signature', () => {
      const rawBody = JSON.stringify({ event: 'charge.success' });
      const headers = new Headers({ 'x-paystack-signature': 'bad_hex_signature' });
      expect(adapter.verifyWebhookSignature(headers, rawBody)).toBe(false);
    });

    it('should parse Paystack webhook event with subunit conversion', () => {
      const rawBody = JSON.stringify({
        event: 'charge.success',
        data: {
          id: 9911,
          reference: 'PSTK-REF-77',
          amount: 5000, // 50.00 in subunits
          currency: 'GHS',
          status: 'success',
          customer: { email: 'sub@nov.com' },
        },
      });

      const parsed = adapter.parseWebhookEvent(rawBody);
      expect(parsed).not.toBeNull();
      expect(parsed?.provider).toBe('PAYSTACK');
      expect(parsed?.eventId).toBe('charge.success:9911');
      expect(parsed?.amount).toBe(50.0);
      expect(parsed?.currency).toBe('GHS');
      expect(parsed?.isSuccessful).toBe(true);
      expect(parsed?.transactionRef).toBe('PSTK-REF-77');
    });
  });
});
