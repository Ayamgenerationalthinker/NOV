import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookService } from '@/services/payment/webhook.service';
import { PaymentService } from '@/services/payment/payment.service';
import { PaystackAdapter } from '@/services/payment/paystack.adapter';
import { FlutterwaveAdapter } from '@/services/payment/flutterwave.adapter';
import { OrderService } from '@/services/order/order.service';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    paymentWebhookEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/services/order/order.service', () => ({
  OrderService: {
    transitionOrderStatus: vi.fn(),
  },
}));

const PAYSTACK_KEY = 'sk_test_webhook_unit';
const FLW_HASH = 'flw-unit-hash';
const REF = 'PSTK-NOV-888-deadbeef';

function signPaystack(body: string) {
  return new Headers({ 'x-paystack-signature': crypto.createHmac('sha512', PAYSTACK_KEY).update(body).digest('hex') });
}

function storedTransaction(orderStatus = 'PENDING', txStatus = 'INITIALIZED') {
  return {
    id: 'tx-1',
    orderId: 'order-paystack-1',
    provider: 'PAYSTACK',
    transactionRef: REF,
    providerRef: null,
    amount: 75,
    currency: 'GHS',
    status: txStatus,
    paymentMethod: null,
    rawPayload: null,
    order: { id: 'order-paystack-1', orderNumber: 'NOV-888', status: orderStatus, total: 75, currency: 'GHS' },
  };
}

function paystackEvent(event: string, status: string, overrides: Record<string, any> = {}) {
  return JSON.stringify({
    event,
    data: { id: 4242, reference: REF, amount: 7500, currency: 'GHS', status, ...overrides },
  });
}

/** Real adapter for signature/parsing, with the gateway verify call stubbed. */
function useAdapterWithGateway(gateway: Record<string, any>) {
  const adapter = new PaystackAdapter({ secretKey: PAYSTACK_KEY });
  const verify = vi.spyOn(adapter, 'verifyPayment').mockResolvedValue({
    success: true,
    amount: 75,
    currency: 'GHS',
    transactionRef: REF,
    providerRef: '4242',
    status: 'SUCCESSFUL',
    ...gateway,
  });
  PaymentService.setAdapter('PAYSTACK', adapter);
  return verify;
}

describe('WebhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.paymentWebhookEvent.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.paymentWebhookEvent.create).mockResolvedValue({ id: 'webhook-log-1' } as any);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
  });

  afterEach(() => {
    PaymentService.setAdapter('PAYSTACK', new PaystackAdapter());
    PaymentService.setAdapter('FLUTTERWAVE', new FlutterwaveAdapter());
  });

  describe('Security & Signature Verification', () => {
    it('should throw error when Flutterwave signature is missing or invalid', async () => {
      PaymentService.setAdapter('FLUTTERWAVE', new FlutterwaveAdapter({ secretKey: 'k', webhookSecret: FLW_HASH }));

      await expect(
        WebhookService.processWebhook('FLUTTERWAVE', new Headers(), JSON.stringify({ event: 'charge.completed' }))
      ).rejects.toThrow('Invalid FLUTTERWAVE webhook signature');
      await expect(
        WebhookService.processWebhook('FLUTTERWAVE', new Headers({ 'verif-hash': 'flutterwave-secret-hash-dev' }), '{}')
      ).rejects.toThrow('Invalid FLUTTERWAVE webhook signature');
    });

    it('should throw error when Paystack signature is invalid', async () => {
      PaymentService.setAdapter('PAYSTACK', new PaystackAdapter({ secretKey: PAYSTACK_KEY }));
      const headers = new Headers({ 'x-paystack-signature': 'wrong-signature' });

      await expect(
        WebhookService.processWebhook('PAYSTACK', headers, JSON.stringify({ event: 'charge.success' }))
      ).rejects.toThrow('Invalid PAYSTACK webhook signature');
    });

    it('should reject a webhook forged with the old hard-coded dev secret', async () => {
      PaymentService.setAdapter('PAYSTACK', new PaystackAdapter({ secretKey: undefined }));
      const body = paystackEvent('charge.success', 'success');
      const forged = new Headers({
        'x-paystack-signature': crypto.createHmac('sha512', 'paystack-secret-dev').update(body).digest('hex'),
      });

      await expect(WebhookService.processWebhook('PAYSTACK', forged, body)).rejects.toThrow('Invalid PAYSTACK webhook signature');
      expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency Guard', () => {
    it('should skip duplicate webhooks that were already successfully processed', async () => {
      PaymentService.setAdapter('FLUTTERWAVE', new FlutterwaveAdapter({ secretKey: 'k', webhookSecret: FLW_HASH }));
      const rawBody = JSON.stringify({
        event: 'charge.completed',
        data: { id: 123, tx_ref: 'FLW-NOV-999', amount: 50, currency: 'GHS', status: 'successful' },
      });

      vi.mocked(prisma.paymentWebhookEvent.findFirst).mockResolvedValue({ id: 'existing-event-id', isProcessed: true } as any);

      const result = await WebhookService.processWebhook('FLUTTERWAVE', new Headers({ 'verif-hash': FLW_HASH }), rawBody);

      expect(result.isDuplicate).toBe(true);
      expect(result.message).toContain('idempotent skip');
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
      expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('Payment confirmation through the webhook', () => {
    it('re-verifies with the gateway and transitions the order to PAID when everything matches', async () => {
      const verify = useAdapterWithGateway({});
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
      const body = paystackEvent('charge.success', 'success');

      const result = await WebhookService.processWebhook('PAYSTACK', signPaystack(body), body);

      expect(verify).toHaveBeenCalledWith(REF);
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-paystack-1');
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tx-1' }, data: expect.objectContaining({ status: 'SUCCESSFUL' }) })
      );
      expect(OrderService.transitionOrderStatus).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-paystack-1', toStatus: 'PAID', transactionRef: REF })
      );
      expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'webhook-log-1' }, data: expect.objectContaining({ isProcessed: true }) })
      );
    });

    it('does not trust a "success" payload when the gateway says the payment failed', async () => {
      useAdapterWithGateway({ success: false, status: 'FAILED' });
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
      const body = paystackEvent('charge.success', 'success');

      const result = await WebhookService.processWebhook('PAYSTACK', signPaystack(body), body);

      expect(result.success).toBe(false);
      expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
    });

    it('rejects a webhook whose gateway amount does not match the order total', async () => {
      useAdapterWithGateway({ amount: 1 });
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
      const body = paystackEvent('charge.success', 'success', { amount: 100 });

      const result = await WebhookService.processWebhook('PAYSTACK', signPaystack(body), body);

      expect(result.success).toBe(false);
      expect(result.message).toContain('AMOUNT_MISMATCH');
      expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
    });

    it('ignores orderId metadata in the payload when the reference is unknown', async () => {
      const verify = useAdapterWithGateway({});
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue(null);
      const body = JSON.stringify({
        event: 'charge.success',
        data: { id: 1, reference: 'PSTK-UNKNOWN', amount: 100, currency: 'GHS', status: 'success', metadata: { orderId: 'order-victim' } },
      });

      const result = await WebhookService.processWebhook('PAYSTACK', signPaystack(body), body);

      expect(result.success).toBe(false);
      expect(verify).not.toHaveBeenCalled();
      expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('a failed-payment event never downgrades a PAID order or a successful transaction', async () => {
      useAdapterWithGateway({});
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction('PAID', 'SUCCESSFUL') as any);
      const body = paystackEvent('charge.failed', 'failed');

      await WebhookService.processWebhook('PAYSTACK', signPaystack(body), body);

      expect(prisma.transaction.update).not.toHaveBeenCalled();
      // Only PENDING orders may move to FAILED
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-paystack-1', status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
