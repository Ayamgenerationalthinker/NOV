import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '@/services/admin/analytics.service';
import { prisma } from '@/lib/prisma';
import { OrderService } from '@/services/order/order.service';
import { OrderStatus, Role, EntitlementStatus } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    refund: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    download: {
      count: vi.fn(),
    },
    entitlement: {
      count: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/services/order/order.service', () => ({
  OrderService: {
    transitionOrderStatus: vi.fn(),
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOverviewMetrics', () => {
    it('should calculate gross revenue, net revenue, AOV, and conversion rates correctly', async () => {
      // Mock 2 paid orders of $100 and $50
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([
        { total: 100 as any, currency: 'USD' },
        { total: 50 as any, currency: 'USD' },
      ] as any);

      // Mock 1 refund of $20
      vi.mocked(prisma.refund.findMany).mockResolvedValueOnce([
        { amount: 20 as any },
      ] as any);

      // Mock counts: total=4, paid=2, refunded=1, pending=1, customers=5, downloads=12, entitlements=3
      vi.mocked(prisma.order.count)
        .mockResolvedValueOnce(4) // total orders
        .mockResolvedValueOnce(2) // paid orders
        .mockResolvedValueOnce(1) // refunded orders
        .mockResolvedValueOnce(1); // pending orders

      vi.mocked(prisma.user.count).mockResolvedValueOnce(5);
      vi.mocked(prisma.download.count).mockResolvedValueOnce(12);
      vi.mocked(prisma.entitlement.count).mockResolvedValueOnce(3);

      const metrics = await AnalyticsService.getOverviewMetrics();

      expect(metrics.grossRevenue).toBe(150);
      expect(metrics.totalRefunds).toBe(20);
      expect(metrics.netRevenue).toBe(130);
      expect(metrics.totalOrders).toBe(4);
      expect(metrics.paidOrders).toBe(2);
      expect(metrics.refundedOrders).toBe(1);
      expect(metrics.pendingOrders).toBe(1);
      expect(metrics.averageOrderValue).toBe(75); // 150 / 2
      expect(metrics.conversionRate).toBe(50); // (2 / 4) * 100
      expect(metrics.totalCustomers).toBe(5);
      expect(metrics.totalDownloads).toBe(12);
      expect(metrics.activeEntitlements).toBe(3);
    });

    it('should handle zero orders gracefully without division by zero', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.refund.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.order.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.mocked(prisma.user.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.download.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.entitlement.count).mockResolvedValueOnce(0);

      const metrics = await AnalyticsService.getOverviewMetrics();

      expect(metrics.grossRevenue).toBe(0);
      expect(metrics.netRevenue).toBe(0);
      expect(metrics.totalRefunds).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
      expect(metrics.conversionRate).toBe(0);
    });
  });

  describe('getRevenueTimeSeries', () => {
    it('should generate an unbroken time-series with zero-filled gaps', async () => {
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([
        {
          paidAt: now,
          createdAt: now,
          total: 85 as any,
        },
      ] as any);

      const series = await AnalyticsService.getRevenueTimeSeries(7);

      expect(series.length).toBe(8); // 0 to 7 inclusive
      const todayEntry = series.find((s) => s.date === dateKey);
      expect(todayEntry).toBeDefined();
      expect(todayEntry?.revenue).toBe(85);
      expect(todayEntry?.orderCount).toBe(1);
    });
  });

  describe('getTopProducts', () => {
    it('should aggregate revenue and rank top products descending', async () => {
      vi.mocked(prisma.orderItem.findMany).mockResolvedValueOnce([
        {
          totalPrice: 100 as any,
          product: {
            id: 'p1',
            title: 'Product A',
            slug: 'product-a',
            coverImage: null,
            price: 50 as any,
            currency: 'USD',
          },
        },
        {
          totalPrice: 100 as any,
          product: {
            id: 'p1',
            title: 'Product A',
            slug: 'product-a',
            coverImage: null,
            price: 50 as any,
            currency: 'USD',
          },
        },
        {
          totalPrice: 40 as any,
          product: {
            id: 'p2',
            title: 'Product B',
            slug: 'product-b',
            coverImage: null,
            price: 40 as any,
            currency: 'USD',
          },
        },
      ] as any);

      const top = await AnalyticsService.getTopProducts(5);

      expect(top.length).toBe(2);
      expect(top[0].productId).toBe('p1');
      expect(top[0].totalRevenue).toBe(200);
      expect(top[0].unitsSold).toBe(2);

      expect(top[1].productId).toBe('p2');
      expect(top[1].totalRevenue).toBe(40);
      expect(top[1].unitsSold).toBe(1);
    });
  });

  describe('processAdminRefund', () => {
    it('should throw error if order does not exist', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      await expect(
        AnalyticsService.processAdminRefund({
          orderId: 'missing-order',
          adminUserId: 'admin-1',
        })
      ).rejects.toThrow('Order missing-order not found');
    });

    it('should throw error if order is already refunded', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord-1',
        status: OrderStatus.REFUNDED,
      } as any);

      await expect(
        AnalyticsService.processAdminRefund({
          orderId: 'ord-1',
          adminUserId: 'admin-1',
        })
      ).rejects.toThrow('Order has already been refunded');
    });

    it('should throw error if order is not in PAID status', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord-1',
        status: OrderStatus.PENDING,
      } as any);

      await expect(
        AnalyticsService.processAdminRefund({
          orderId: 'ord-1',
          adminUserId: 'admin-1',
        })
      ).rejects.toThrow('Cannot refund order with status PENDING');
    });

    it('should create refund record and transition order status to REFUNDED', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        id: 'ord-100',
        orderNumber: 'NOV-ORD-100',
        status: OrderStatus.PAID,
        total: 75 as any,
        currency: 'USD',
        transactions: [{ id: 'tx-1', status: 'SUCCESSFUL' }],
      } as any);

      vi.mocked(prisma.refund.create).mockResolvedValueOnce({
        id: 'ref-1',
        orderId: 'ord-100',
        amount: 75 as any,
        currency: 'USD',
        status: 'COMPLETED',
        reason: 'Customer complaint',
      } as any);

      vi.mocked(OrderService.transitionOrderStatus).mockResolvedValueOnce({
        id: 'ord-100',
        status: OrderStatus.REFUNDED,
      } as any);

      const result = await AnalyticsService.processAdminRefund({
        orderId: 'ord-100',
        reason: 'Customer complaint',
        adminUserId: 'admin-user-id',
      });

      expect(prisma.refund.create).toHaveBeenCalledWith({
        data: {
          orderId: 'ord-100',
          transactionId: 'tx-1',
          amount: 75,
          currency: 'USD',
          status: 'COMPLETED',
          reason: 'Customer complaint',
          requestedBy: 'admin-user-id',
          approvedBy: 'admin-user-id',
        },
      });

      expect(OrderService.transitionOrderStatus).toHaveBeenCalledWith({
        orderId: 'ord-100',
        toStatus: OrderStatus.REFUNDED,
        adminUserId: 'admin-user-id',
        notes: 'Customer complaint',
      });

      expect(result.order.status).toBe(OrderStatus.REFUNDED);
      expect(result.refund.id).toBe('ref-1');
    });
  });

  describe('getCustomers', () => {
    it('should calculate customer lifetime spend and active entitlements', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'buyer@example.com',
          name: 'John Doe',
          role: Role.CUSTOMER,
          createdAt: new Date(),
          orders: [{ total: 50 as any }, { total: 45 as any }],
          _count: { orders: 2, entitlements: 2 },
        },
      ] as any);
      vi.mocked(prisma.user.count).mockResolvedValueOnce(1);

      const res = await AnalyticsService.getCustomers({ page: 1, limit: 10 });

      expect(res.customers.length).toBe(1);
      expect(res.customers[0].email).toBe('buyer@example.com');
      expect(res.customers[0].lifetimeSpend).toBe(95);
      expect(res.customers[0].totalOrders).toBe(2);
      expect(res.customers[0].activeEntitlements).toBe(2);
      expect(res.pagination.total).toBe(1);
    });
  });
});
