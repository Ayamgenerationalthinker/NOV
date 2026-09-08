import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '@/services/payment/webhook.service';
import { PaymentService } from '@/services/payment/payment.service';
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
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/services/order/order.service', () => ({
  OrderService: {
    transitionOrderStatus: vi.fn(),
  },
}));

describe('WebhookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Security & Signature Verification', () => {
    it('should throw error when Flutterwave signature is missing or invalid', async () => {
      const headers = new Headers(); // missing 'verif-hash'
      const rawBody = JSON.stringify({ event: 'charge.completed' });

      await expect(
        WebhookService.processWebhook('FLUTTERWAVE', headers, rawBody)
      ).rejects.toThrow('Invalid FLUTTERWAVE webhook signature');
    });

    it('should throw error when Paystack signature is invalid', async () => {
      const headers = new Headers({ 'x-paystack-signature': 'wrong-signature' });
      const rawBody = JSON.stringify({ event: 'charge.success' });

      await expect(
        WebhookService.processWebhook('PAYSTACK', headers, rawBody)
      ).rejects.toThrow('Invalid PAYSTACK webhook signature');
    });
  });

  describe('Idempotency Guard', () => {
    it('should skip duplicate webhooks that were already successfully processed', async () => {
      const rawBody = JSON.stringify({
        event: 'charge.completed',
        data: {
          id: 'evt_dup_123',
          tx_ref: 'FLW-NOV-999',
          amount: 50,
          currency: 'USD',
          status: 'successful',
        },
      });

      // Mock valid signature
      const headers = new Headers({ 'verif-hash': 'flutterwave-secret-hash-dev' });

      // Mock finding existing processed event
      vi.mocked(prisma.paymentWebhookEvent.findFirst).mockResolvedValue({
        id: 'existing-event-id',
        provider: 'FLUTTERWAVE',
        eventType: 'charge.completed',
        eventId: 'evt_dup_123',
        payload: {},
        isProcessed: true,
        processedAt: new Date(),
        error: null,
        createdAt: new Date(),
      });

      const result = await WebhookService.processWebhook('FLUTTERWAVE', headers, rawBody);

      expect(result.isDuplicate).toBe(true);
      expect(result.message).toContain('idempotent skip');
      // Must not create new event or transition order again
      expect(prisma.paymentWebhookEvent.create).not.toHaveBeenCalled();
      expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('Successful Processing & Entitlement Pipeline Trigger', () => {
    it('should process valid Paystack webhook, update transaction, and transition order to PAID', async () => {
      const payload = {
        event: 'charge.success',
        id: 'evt_paystack_456',
        data: {
          reference: 'PSTK-NOV-888',
          amount: 7500, // $75.00
          currency: 'USD',
          status: 'success',
        },
      };
      const rawBody = JSON.stringify(payload);
      const secret = 'paystack-secret-dev';
      const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
      const headers = new Headers({ 'x-paystack-signature': signature });

      // No prior duplicate
      vi.mocked(prisma.paymentWebhookEvent.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.paymentWebhookEvent.create).mockResolvedValue({
        id: 'webhook-log-1',
        provider: 'PAYSTACK',
        eventType: 'charge.success',
        eventId: 'evt_paystack_456',
        payload: payload as any,
        isProcessed: false,
        processedAt: null,
        error: null,
        createdAt: new Date(),
      });

      // Transaction found in DB
      vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
        id: 'tx-1',
        orderId: 'order-paystack-1',
        provider: 'PAYSTACK',
        transactionRef: 'PSTK-NOV-888',
        providerRef: null,
        amount: 75 as any,
        currency: 'USD',
        status: 'INITIALIZED' as any,
        paymentMethod: null,
        feeAmount: null,
        rawPayload: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        order: { id: 'order-paystack-1' } as any,
      } as any);

      vi.mocked(prisma.transaction.update).mockResolvedValue({} as any);
      vi.mocked(OrderService.transitionOrderStatus).mockResolvedValue({} as any);
      vi.mocked(prisma.paymentWebhookEvent.update).mockResolvedValue({} as any);

      const result = await WebhookService.processWebhook('PAYSTACK', headers, rawBody);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-paystack-1');
      expect(result.transactionRef).toBe('PSTK-NOV-888');

      // Verify Transaction updated to SUCCESSFUL
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tx-1' },
          data: expect.objectContaining({ status: 'SUCCESSFUL' }),
        })
      );

      // Verify Order transition to PAID called
      expect(OrderService.transitionOrderStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-paystack-1',
          toStatus: 'PAID',
          paymentProvider: 'PAYSTACK',
          transactionRef: 'PSTK-NOV-888',
        })
      );

      // Verify Webhook event marked isProcessed = true
      expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'webhook-log-1' },
          data: expect.objectContaining({ isProcessed: true }),
        })
      );
    });
  });
});
