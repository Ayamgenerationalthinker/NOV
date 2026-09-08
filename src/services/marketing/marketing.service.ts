import { prisma } from '@/lib/prisma';
import { EmailService } from '@/services/email/email.service';
import { env } from '@/lib/env';
import { OrderStatus } from '@prisma/client';

export interface FlashSaleCampaign {
  id: string;
  headline: string;
  badge: string;
  couponCode: string;
  discountText: string;
  endDate: string;
  isActive: boolean;
}

// In-memory campaign state with resilient production default
let currentFlashSale: FlashSaleCampaign = {
  id: 'campaign-launch-2026',
  headline: 'Launch Week Flash Event: Get 25% Off All Digital Goods & Bundles',
  badge: 'FLASH SALE',
  couponCode: 'LAUNCH25',
  discountText: '25% OFF',
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
};

export class MarketingService {
  /**
   * Subscribe an email to the newsletter and dispatch welcome discount
   */
  static async subscribeNewsletter(email: string): Promise<{ success: boolean; isNew: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new Error('Please provide a valid email address.');
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing && existing.isActive) {
      return {
        success: true,
        isNew: false,
        message: "You're already subscribed! Check your inbox for exclusive updates.",
      };
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      update: { isActive: true },
      create: { email: normalizedEmail, isActive: true },
    });

    // Send welcome discount email asynchronously
    EmailService.sendNewsletterWelcomeEmail(normalizedEmail, 'WELCOME10').catch((err) => {
      console.error(`Failed to send newsletter welcome email to ${normalizedEmail}:`, err);
    });

    return {
      success: true,
      isNew: true,
      message: 'Subscription successful! Use code WELCOME10 for 10% off your purchase.',
    };
  }

  /**
   * Unsubscribe an email from the newsletter
   */
  static async unsubscribeNewsletter(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscriber) return false;

    await prisma.newsletterSubscriber.update({
      where: { email: normalizedEmail },
      data: { isActive: false },
    });

    return true;
  }

  /**
   * Get newsletter subscribers list for administrators
   */
  static async getSubscribers() {
    const [subscribers, totalCount, activeCount] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        orderBy: { subscribedAt: 'desc' },
      }),
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
    ]);

    return {
      subscribers,
      totalCount,
      activeCount,
    };
  }

  /**
   * Find abandoned checkouts (PENDING orders created at least `hoursAgo` hours ago)
   */
  static async getAbandonedCheckouts(hoursAgo: number = 1) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    const abandonedOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lte: cutoffDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, price: true },
            },
          },
        },
      },
    });

    return abandonedOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name || o.guestName || 'Guest Customer',
      customerEmail: o.customer?.email || o.guestEmail || null,
      itemCount: o.items.length,
      items: o.items.map((i) => ({
        title: i.product.title,
        price: Number(i.totalPrice),
      })),
      total: Number(o.total),
      currency: o.currency,
      createdAt: o.createdAt,
    }));
  }

  /**
   * Send personalized recovery email for an abandoned checkout order
   */
  static async sendAbandonedCheckoutReminder(orderId: string, discountCode: string = 'RECOVER15') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: { title: true, price: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error(`Order ${order.orderNumber} is not abandoned (current status: ${order.status}).`);
    }

    const recipientEmail = order.customer?.email || order.guestEmail;
    if (!recipientEmail) {
      throw new Error(`No email address associated with order ${order.orderNumber}.`);
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL || 'https://nov.com';
    const recoveryUrl = `${appUrl}/checkout?orderId=${order.id}`;

    const dispatched = await EmailService.sendAbandonedCartEmail({
      toEmail: recipientEmail,
      customerName: order.customer?.name || order.guestName || undefined,
      orderNumber: order.orderNumber,
      items: order.items.map((i) => ({
        title: i.product.title,
        price: Number(i.totalPrice),
      })),
      totalAmount: Number(order.total),
      currency: order.currency,
      recoveryUrl,
      discountCode,
    });

    return {
      success: dispatched,
      orderNumber: order.orderNumber,
      recipientEmail,
    };
  }

  /**
   * Get active flash sale banner configuration
   */
  static getFlashSaleCampaign(): FlashSaleCampaign {
    return currentFlashSale;
  }

  /**
   * Update flash sale banner configuration
   */
  static updateFlashSaleCampaign(data: Partial<FlashSaleCampaign>): FlashSaleCampaign {
    currentFlashSale = {
      ...currentFlashSale,
      ...data,
    };
    return currentFlashSale;
  }
}
