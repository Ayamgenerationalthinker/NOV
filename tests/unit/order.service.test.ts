import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '@/services/order/order.service';
import { EntitlementService } from '@/services/entitlement/entitlement.service';
import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    couponRedemption: {
      create: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    entitlement: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((arg) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg);
    }),
  },
}));

vi.mock('@/services/entitlement/entitlement.service', () => ({
  EntitlementService: {
    grantEntitlement: vi.fn().mockResolvedValue({ id: 'ent-new' }),
    revokeEntitlement: vi.fn().mockResolvedValue({ id: 'ent-revoked' }),
  },
}));

describe('OrderService & Order State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateOrderNumber', () => {
    it('generates unique NOV-prefixed order numbers', () => {
      const orderNumber1 = OrderService.generateOrderNumber();
      const orderNumber2 = OrderService.generateOrderNumber();

      expect(orderNumber1).toMatch(/^NOV-\d+-\d{4}$/);
      expect(orderNumber2).toMatch(/^NOV-\d+-\d{4}$/);
      expect(orderNumber1).not.toBe(orderNumber2);
    });
  });

  describe('createOrder with zero-trust pricing', () => {
    it('fetches prices strictly from database and ignores client input', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          id: 'prod-1',
          title: 'Database Mastery',
          price: 99 as any,
          discountPrice: 79 as any,
          isPublished: true,
        } as any,
        {
          id: 'prod-2',
          title: 'API Architecture Guide',
          price: 49 as any,
          discountPrice: null,
          isPublished: true,
        } as any,
      ]);

      vi.mocked(prisma.order.create).mockResolvedValue({
        id: 'order-123',
        orderNumber: 'NOV-123456-1234',
        subtotal: 128 as any,
        total: 128 as any,
        discountTotal: 0 as any,
        taxTotal: 0 as any,
        status: OrderStatus.PENDING,
        items: [{ id: 'item-1' }, { id: 'item-2' }],
      } as any);

      const order = await OrderService.createOrder({
        guestEmail: 'customer@example.com',
        guestName: 'Jane Customer',
        items: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      });

      // Subtotal should be 79 (sale) + 49 = 128
      expect(order.subtotal).toBe(128);
      expect(order.total).toBe(128);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items).toHaveLength(2);
    });

    it('rejects order creation if items list is empty', async () => {
      await expect(
        OrderService.createOrder({
          guestEmail: 'customer@example.com',
          items: [],
        })
      ).rejects.toThrow('Cannot create an empty order');
    });

    it('rejects order creation if neither customerId nor guestEmail is provided', async () => {
      await expect(
        OrderService.createOrder({
          items: [{ productId: 'prod-1' }],
        })
      ).rejects.toThrow('A customer account or guest email address is required');
    });
  });

  describe('transitionOrderStatus State Machine', () => {
    it('successfully transitions from PENDING to PAID and automatically grants entitlements', async () => {
      const mockPendingOrder = {
        id: 'order-1',
        orderNumber: 'NOV-123-4567',
        status: OrderStatus.PENDING,
        customerId: 'customer-1',
        items: [
          { id: 'item-1', productId: 'prod-1' },
          { id: 'item-2', productId: 'prod-2' },
        ],
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockPendingOrder as any);
      vi.mocked(prisma.order.update).mockResolvedValue({
        ...mockPendingOrder,
        status: OrderStatus.PAID,
        paidAt: new Date(),
      } as any);

      const updated = await OrderService.transitionOrderStatus({
        orderId: 'order-1',
        toStatus: OrderStatus.PAID,
        paymentProvider: 'FLUTTERWAVE',
        transactionRef: 'flw-tx-999',
      });

      expect(updated.status).toBe(OrderStatus.PAID);

      // Verify entitlements were granted for both products
      expect(EntitlementService.grantEntitlement).toHaveBeenCalledTimes(2);
      expect(EntitlementService.grantEntitlement).toHaveBeenCalledWith({
        customerId: 'customer-1',
        productId: 'prod-1',
        orderId: 'order-1',
      });
      expect(EntitlementService.grantEntitlement).toHaveBeenCalledWith({
        customerId: 'customer-1',
        productId: 'prod-2',
        orderId: 'order-1',
      });
    });

    it('blocks illegal status transition from PAID back to PENDING', async () => {
      const mockPaidOrder = {
        id: 'order-paid',
        status: OrderStatus.PAID,
        items: [],
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockPaidOrder as any);

      await expect(
        OrderService.transitionOrderStatus({
          orderId: 'order-paid',
          toStatus: OrderStatus.PENDING,
        })
      ).rejects.toThrow('Invalid order status transition');
    });
  });
});
