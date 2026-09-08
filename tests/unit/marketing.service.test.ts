import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketingService } from '@/services/marketing/marketing.service';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/services/email/email.service';
import { OrderStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    newsletterSubscriber: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/services/email/email.service', () => ({
  EmailService: {
    sendNewsletterWelcomeEmail: vi.fn().mockResolvedValue(true),
    sendAbandonedCartEmail: vi.fn().mockResolvedValue(true),
  },
}));

describe('MarketingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeNewsletter', () => {
    it('should reject invalid email formats', async () => {
      await expect(MarketingService.subscribeNewsletter('not-an-email')).rejects.toThrow(
        'Please provide a valid email address'
      );
    });

    it('should subscribe new email and dispatch welcome discount email', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.newsletterSubscriber.upsert).mockResolvedValueOnce({
        id: 'sub-1',
        email: 'developer@example.com',
        isActive: true,
        subscribedAt: new Date(),
      } as any);

      const result = await MarketingService.subscribeNewsletter('developer@example.com');

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
      expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
        where: { email: 'developer@example.com' },
        update: { isActive: true },
        create: { email: 'developer@example.com', isActive: true },
      });
      expect(EmailService.sendNewsletterWelcomeEmail).toHaveBeenCalledWith(
        'developer@example.com',
        'WELCOME10'
      );
    });

    it('should return isNew=false if email is already actively subscribed', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValueOnce({
        id: 'sub-1',
        email: 'active@example.com',
        isActive: true,
      } as any);

      const result = await MarketingService.subscribeNewsletter('active@example.com');

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(false);
      expect(result.message).toContain('already subscribed');
      expect(prisma.newsletterSubscriber.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeNewsletter', () => {
    it('should set isActive to false for existing subscriber', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValueOnce({
        id: 'sub-1',
        email: 'optout@example.com',
      } as any);
      vi.mocked(prisma.newsletterSubscriber.update).mockResolvedValueOnce({} as any);

      const res = await MarketingService.unsubscribeNewsletter('optout@example.com');

      expect(res).toBe(true);
      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith({
        where: { email: 'optout@example.com' },
        data: { isActive: false },
      });
    });

    it('should return false if subscriber email not found', async () => {
      vi.mocked(prisma.newsletterSubscriber.findUnique).mockResolvedValueOnce(null);

      const res = await MarketingService.unsubscribeNewsletter('nonexistent@example.com');
      expect(res).toBe(false);
    });
  });

  describe('getAbandonedCheckouts', () => {
    it('should query and format abandoned pending orders', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([
        {
          id: 'ord-abandoned-1',
          orderNumber: 'NOV-ABANDON-1',
          guestEmail: 'cart@buyer.com',
          guestName: 'Cart Abandoner',
          customer: null,
          total: 80 as any,
          currency: 'USD',
          createdAt: new Date(),
          items: [
            {
              totalPrice: 80 as any,
              product: {
                id: 'p1',
                title: 'Fullstack Kit',
                slug: 'fullstack-kit',
                price: 80 as any,
              },
            },
          ],
        },
      ] as any);

      const checkouts = await MarketingService.getAbandonedCheckouts(1);

      expect(checkouts.length).toBe(1);
      expect(checkouts[0].orderNumber).toBe('NOV-ABANDON-1');
      expect(checkouts[0].customerEmail).toBe('cart@buyer.com');
      expect(checkouts[0].total).toBe(80);
      expect(checkouts[0].items[0].title).toBe('Fullstack Kit');
    });
  });

  describe('sendAbandonedCheckoutReminder', () => {
    it('should throw if order is not in PENDING status', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord-paid',
        orderNumber: 'NOV-PAID-1',
        status: OrderStatus.PAID,
      } as any);

      await expect(
        MarketingService.sendAbandonedCheckoutReminder('ord-paid')
      ).rejects.toThrow('is not abandoned');
    });

    it('should dispatch recovery reminder email for pending order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord-rec',
        orderNumber: 'NOV-REC-1',
        status: OrderStatus.PENDING,
        guestEmail: 'recover@user.com',
        guestName: 'Recover User',
        total: 45 as any,
        currency: 'USD',
        items: [
          {
            totalPrice: 45 as any,
            product: { title: 'Starter Template', price: 45 as any },
          },
        ],
      } as any);

      const result = await MarketingService.sendAbandonedCheckoutReminder('ord-rec', 'RECOVER15');

      expect(result.success).toBe(true);
      expect(result.orderNumber).toBe('NOV-REC-1');
      expect(EmailService.sendAbandonedCartEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'recover@user.com',
          orderNumber: 'NOV-REC-1',
          discountCode: 'RECOVER15',
        })
      );
    });
  });

  describe('FlashSaleCampaign', () => {
    it('should get and update flash sale campaign state', () => {
      const initial = MarketingService.getFlashSaleCampaign();
      expect(initial.couponCode).toBeDefined();

      const updated = MarketingService.updateFlashSaleCampaign({
        couponCode: 'HOLIDAY30',
        discountText: '30% OFF',
      });

      expect(updated.couponCode).toBe('HOLIDAY30');
      expect(updated.discountText).toBe('30% OFF');
    });
  });
});
