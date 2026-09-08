import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '@/services/email/email.service';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
  },
}));

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmail (Dev Mode / Mock)', () => {
    it('should successfully log and return mock response in dev environment', async () => {
      const result = await EmailService.sendEmail({
        to: 'buyer@example.com',
        subject: 'Test Subject',
        html: '<p>Hello World</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock_');
    });
  });

  describe('sendOrderReceiptEmail', () => {
    it('should format order receipt and dispatch email to customer', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord-100',
        orderNumber: 'NOV-888888-9999',
        customerId: 'cust-1',
        guestEmail: null,
        guestName: null,
        total: 120 as any,
        subtotal: 150 as any,
        discountTotal: 30 as any,
        currency: 'USD',
        paymentProvider: 'FLUTTERWAVE',
        createdAt: new Date(),
        customer: {
          id: 'cust-1',
          name: 'Sarah Connor',
          email: 'sarah@resistance.org',
        },
        items: [
          {
            id: 'item-1',
            totalPrice: 120 as any,
            product: {
              title: 'Full-Stack Next.js 16 Kit',
              slug: 'nextjs-16-kit',
              productType: 'SOURCE_CODE',
            },
          },
        ],
        transactions: [
          {
            transactionRef: 'FLW-NOV-888888-9999',
            createdAt: new Date(),
          },
        ],
      } as any);

      const spy = vi.spyOn(EmailService, 'sendEmail');

      const success = await EmailService.sendOrderReceiptEmail('ord-100');

      expect(success).toBe(true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sarah@resistance.org',
          subject: expect.stringContaining('NOV-888888-9999'),
          html: expect.stringContaining('Full-Stack Next.js 16 Kit'),
        })
      );
    });

    it('should return false if order does not exist', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      const success = await EmailService.sendOrderReceiptEmail('missing-order');
      expect(success).toBe(false);
    });
  });

  describe('sendRefundConfirmationEmail', () => {
    it('should dispatch refund notice with reason and amount', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: 'ord-200',
        orderNumber: 'NOV-777777-1111',
        total: 49.99 as any,
        currency: 'USD',
        customer: {
          email: 'customer@refund.com',
          name: 'John Doe',
        },
      } as any);

      const spy = vi.spyOn(EmailService, 'sendEmail');

      const success = await EmailService.sendRefundConfirmationEmail('ord-200', 'Accidental duplicate purchase');

      expect(success).toBe(true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@refund.com',
          subject: expect.stringContaining('NOV-777777-1111'),
          html: expect.stringContaining('Accidental duplicate purchase'),
        })
      );
    });
  });

  describe('sendProductUpdateEmail', () => {
    it('should broadcast update notification to all active entitlement owners', async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        title: 'Modern UI Icons Pack',
        entitlements: [
          {
            id: 'ent-1',
            status: 'ACTIVE',
            customer: { email: 'owner1@nov.com' },
          },
          {
            id: 'ent-2',
            status: 'ACTIVE',
            customer: { email: 'owner2@nov.com' },
          },
        ],
      } as any);

      const spy = vi.spyOn(EmailService, 'sendEmail');

      const result = await EmailService.sendProductUpdateEmail({
        productId: 'prod-1',
        versionNumber: '2.0.0',
        changelog: 'Added 500+ new SVG icons and Figma components.',
      });

      expect(result.dispatchedCount).toBe(2);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner1@nov.com',
          subject: expect.stringContaining('v2.0.0'),
          html: expect.stringContaining('Added 500+ new SVG icons'),
        })
      );
    });
  });
});
