import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '@/services/payment/payment.service';
import { FlutterwaveAdapter } from '@/services/payment/flutterwave.adapter';
import { PaystackAdapter } from '@/services/payment/paystack.adapter';
import crypto from 'crypto';

describe('PaymentService & Adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const adapter = new FlutterwaveAdapter();

    it('should initialize payment in test/simulated mode', async () => {
      const result = await adapter.initializePayment({
        orderId: 'order-123',
        orderNumber: 'NOV-100001-TEST',
        amount: 49.99,
        currency: 'USD',
        customerEmail: 'customer@nov.com',
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      expect(result.provider).toBe('FLUTTERWAVE');
      expect(result.transactionRef).toContain('FLW-NOV-100001-TEST');
      expect(result.paymentUrl).toContain('/api/payments/verify');
      expect(result.paymentUrl).toContain('status=successful');
    });

    it('should reject invalid webhook signature', () => {
      const headers = new Headers({ 'verif-hash': 'invalid-hash' });
      const isValid = adapter.verifyWebhookSignature(headers, '{"event":"charge.completed"}');
      expect(isValid).toBe(false);
    });

    it('should parse webhook event successfully', () => {
      const samplePayload = JSON.stringify({
        event: 'charge.completed',
        data: {
          id: 998877,
          tx_ref: 'FLW-NOV-123456',
          amount: 50,
          currency: 'USD',
          status: 'successful',
          customer: { email: 'buyer@test.com' },
        },
      });

      const parsed = adapter.parseWebhookEvent(samplePayload);
      expect(parsed).not.toBeNull();
      expect(parsed?.provider).toBe('FLUTTERWAVE');
      expect(parsed?.eventType).toBe('charge.completed');
      expect(parsed?.transactionRef).toBe('FLW-NOV-123456');
      expect(parsed?.amount).toBe(50);
      expect(parsed?.isSuccessful).toBe(true);
    });
  });

  describe('PaystackAdapter', () => {
    const adapter = new PaystackAdapter();

    it('should initialize payment in test/simulated mode', async () => {
      const result = await adapter.initializePayment({
        orderId: 'order-456',
        orderNumber: 'NOV-200002-TEST',
        amount: 25.0,
        currency: 'USD',
        customerEmail: 'paystack-buyer@nov.com',
        callbackUrl: 'http://localhost:3000/api/payments/verify',
      });

      expect(result.provider).toBe('PAYSTACK');
      expect(result.transactionRef).toContain('PSTK-NOV-200002-TEST');
      expect(result.paymentUrl).toContain('/api/payments/verify');
    });

    it('should correctly verify valid HMAC-SHA512 signature', () => {
      const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } });
      const secret = 'paystack-secret-dev';
      const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

      const headers = new Headers({ 'x-paystack-signature': signature });
      const isValid = adapter.verifyWebhookSignature(headers, rawBody);
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC-SHA512 signature', () => {
      const rawBody = JSON.stringify({ event: 'charge.success' });
      const headers = new Headers({ 'x-paystack-signature': 'bad_hex_signature' });
      const isValid = adapter.verifyWebhookSignature(headers, rawBody);
      expect(isValid).toBe(false);
    });

    it('should parse Paystack webhook event with subunit conversion', () => {
      const rawBody = JSON.stringify({
        event: 'charge.success',
        id: 'evt_9911',
        data: {
          reference: 'PSTK-REF-77',
          amount: 5000, // 50.00 in subunits
          currency: 'USD',
          status: 'success',
          customer: { email: 'sub@nov.com' },
        },
      });

      const parsed = adapter.parseWebhookEvent(rawBody);
      expect(parsed).not.toBeNull();
      expect(parsed?.provider).toBe('PAYSTACK');
      expect(parsed?.amount).toBe(50.0);
      expect(parsed?.isSuccessful).toBe(true);
      expect(parsed?.transactionRef).toBe('PSTK-REF-77');
    });
  });
});
