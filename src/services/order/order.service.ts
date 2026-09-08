import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { CouponService } from '../coupon/coupon.service';
import { EntitlementService } from '../entitlement/entitlement.service';
import { EmailService } from '../email/email.service';

export interface CreateOrderParams {
  customerId?: string;
  guestEmail?: string;
  guestName?: string;
  items: Array<{ productId: string }>;
  couponCode?: string;
  currency?: string;
  customerNotes?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface TransitionOrderStatusParams {
  orderId: string;
  toStatus: OrderStatus;
  paymentProvider?: string;
  transactionRef?: string;
  adminUserId?: string;
  notes?: string;
}

export class OrderService {
  /**
   * Generate an audit-friendly, unique order identifier
   */
  static generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `NOV-${timestamp}-${random}`;
  }

  /**
   * Create an order with zero-trust server-side price validation
   */
  static async createOrder({
    customerId,
    guestEmail,
    guestName,
    items,
    couponCode,
    currency = 'USD',
    customerNotes,
    utmSource,
    utmMedium,
    utmCampaign,
  }: CreateOrderParams) {
    if (!items || items.length === 0) {
      throw new Error('Cannot create an empty order. Cart has no items.');
    }

    if (!customerId && !guestEmail) {
      throw new Error('A customer account or guest email address is required to place an order.');
    }

    const productIds = items.map((i) => i.productId);

    // Fetch live product records directly from database
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error('One or more selected products are unavailable or unpublished.');
    }

    // Build order items with server-verified pricing
    let subtotal = 0;
    const orderItemsData = products.map((product) => {
      const unitPrice =
        product.discountPrice !== null && Number(product.discountPrice) < Number(product.price)
          ? Number(product.discountPrice)
          : Number(product.price);

      subtotal += unitPrice;

      return {
        productId: product.id,
        unitPrice,
        discountAmount: 0,
        totalPrice: unitPrice,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;

    // Validate and calculate coupon discount if provided
    let discountTotal = 0;
    let validatedCouponId: string | undefined;

    if (couponCode) {
      const couponResult = await CouponService.validateCoupon({
        code: couponCode,
        subtotal,
        customerId,
      });

      if (couponResult.valid && couponResult.coupon) {
        discountTotal = couponResult.discountAmount;
        validatedCouponId = couponResult.coupon.id;
      }
    }

    const total = Math.max(0, Math.round((subtotal - discountTotal) * 100) / 100);
    const orderNumber = this.generateOrderNumber();

    // Execute atomic creation transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customerId || null,
          guestEmail: guestEmail || null,
          guestName: guestName || null,
          status: OrderStatus.PENDING,
          subtotal,
          discountTotal,
          taxTotal: 0,
          total,
          currency,
          customerNotes: customerNotes || null,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
          items: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // If coupon was applied, record redemption
      if (validatedCouponId) {
        await tx.couponRedemption.create({
          data: {
            couponId: validatedCouponId,
            orderId: newOrder.id,
            customerId: customerId || null,
            discountAmount: discountTotal,
          },
        });

        await tx.coupon.update({
          where: { id: validatedCouponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: customerId || null,
          action: 'CREATE_ORDER',
          entityType: 'Order',
          entityId: newOrder.id,
          newValue: {
            orderNumber,
            total,
            itemCount: items.length,
            couponCode: couponCode || null,
          },
        },
      });

      return newOrder;
    });

    return order;
  }

  /**
   * Order State Machine: transitions status and triggers domain side-effects
   */
  static async transitionOrderStatus({
    orderId,
    toStatus,
    paymentProvider,
    transactionRef,
    adminUserId,
    notes,
  }: TransitionOrderStatusParams) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status === toStatus) {
      return order; // No-op if status unchanged
    }

    // State machine transition validation
    const invalidTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PAID]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.REFUNDED]: [OrderStatus.PENDING, OrderStatus.PAID],
      [OrderStatus.CANCELLED]: [OrderStatus.PAID],
      [OrderStatus.FAILED]: [OrderStatus.PAID],
      [OrderStatus.PENDING]: [],
      [OrderStatus.REFUND_PENDING]: [OrderStatus.PENDING],
      [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.PENDING],
      [OrderStatus.CHARGEBACK]: [OrderStatus.PENDING],
    };

    if (invalidTransitions[order.status]?.includes(toStatus)) {
      throw new Error(
        `Invalid order status transition from ${order.status} to ${toStatus}.`
      );
    }

    const isTransitioningToPaid = toStatus === OrderStatus.PAID;
    const isTransitioningToRefunded = toStatus === OrderStatus.REFUNDED;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: toStatus,
          paymentProvider: paymentProvider || order.paymentProvider,
          paidAt: isTransitioningToPaid ? new Date() : order.paidAt,
          cancelledAt: toStatus === OrderStatus.CANCELLED ? new Date() : order.cancelledAt,
        },
        include: {
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId || order.customerId || null,
          action: `ORDER_STATUS_${toStatus}`,
          entityType: 'Order',
          entityId: order.id,
          oldValue: { status: order.status },
          newValue: { status: toStatus, paymentProvider, transactionRef, notes },
        },
      });

      return updated;
    });

    // Side effect: Automatically grant digital product entitlements upon payment
    if (isTransitioningToPaid) {
      let recipientCustomerId = order.customerId;

      // If guest order, see if an account already exists with guest email
      if (!recipientCustomerId && order.guestEmail) {
        const existingUser = await prisma.user.findUnique({
          where: { email: order.guestEmail },
        });
        if (existingUser) {
          recipientCustomerId = existingUser.id;
          // Associate customer ID with order
          await prisma.order.update({
            where: { id: order.id },
            data: { customerId: existingUser.id },
          });
        }
      }

      if (recipientCustomerId) {
        for (const item of order.items) {
          await EntitlementService.grantEntitlement({
            customerId: recipientCustomerId,
            productId: item.productId,
            orderId: order.id,
          });
        }
      }

      // Asynchronously dispatch digital order receipt & download access email
      EmailService.sendOrderReceiptEmail(order.id).catch((err) => {
        console.error(`Failed to dispatch order receipt email for ${order.id}:`, err);
      });
    }

    // Side effect: Revoke entitlements if order is refunded
    if (isTransitioningToRefunded && order.customerId) {
      const entitlements = await prisma.entitlement.findMany({
        where: {
          orderId: order.id,
          customerId: order.customerId,
        },
      });

      for (const ent of entitlements) {
        await EntitlementService.revokeEntitlement({
          entitlementId: ent.id,
          reason: notes || 'Order refunded',
          adminUserId,
        });
      }

      // Asynchronously dispatch refund confirmation email
      EmailService.sendRefundConfirmationEmail(order.id, notes).catch((err) => {
        console.error(`Failed to dispatch refund email for ${order.id}:`, err);
      });
    }

    return updatedOrder;
  }

  /**
   * Get order by ID with items, products, and customer details
   */
  static async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                productType: true,
                files: {
                  select: { id: true, fileName: true, fileSize: true, versionNumber: true },
                },
              },
            },
          },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        transactions: true,
      },
    });
  }

  /**
   * Get order by order number
   */
  static async getOrderByNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                productType: true,
                files: {
                  select: { id: true, fileName: true, fileSize: true, versionNumber: true },
                },
              },
            },
          },
        },
        transactions: true,
      },
    });
  }

  /**
   * Get customer orders history
   */
  static async getCustomerOrders(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, coverImage: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
