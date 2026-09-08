import { prisma } from '@/lib/prisma';
import { OrderStatus, EntitlementStatus, Role } from '@prisma/client';
import { OrderService } from '@/services/order/order.service';

export interface OverviewMetrics {
  grossRevenue: number;
  netRevenue: number;
  totalRefunds: number;
  totalOrders: number;
  paidOrders: number;
  refundedOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  totalCustomers: number;
  totalDownloads: number;
  activeEntitlements: number;
  currency: string;
}

export interface DailySalesData {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface TopProductMetric {
  productId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  currency: string;
  price: number;
  unitsSold: number;
  totalRevenue: number;
}

export interface CustomerSummary {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  totalOrders: number;
  lifetimeSpend: number;
  activeEntitlements: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AnalyticsService {
  /**
   * Calculate high-level financial & store KPIs
   */
  static async getOverviewMetrics(): Promise<OverviewMetrics> {
    const [
      paidOrders,
      refunds,
      totalOrders,
      paidOrdersCount,
      refundedOrdersCount,
      pendingOrdersCount,
      totalCustomers,
      totalDownloads,
      activeEntitlements,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { status: OrderStatus.PAID },
        select: { total: true, currency: true },
      }),
      prisma.refund.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.PAID } }),
      prisma.order.count({ where: { status: OrderStatus.REFUNDED } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.user.count({ where: { role: Role.CUSTOMER } }),
      prisma.download.count(),
      prisma.entitlement.count({ where: { status: EntitlementStatus.ACTIVE } }),
    ]);

    const grossRevenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

    const totalRefunds = refunds.reduce(
      (sum, refund) => sum + Number(refund.amount),
      0
    );

    const netRevenue = Math.max(0, grossRevenue - totalRefunds);
    const averageOrderValue =
      paidOrdersCount > 0 ? grossRevenue / paidOrdersCount : 0;
    const conversionRate =
      totalOrders > 0 ? (paidOrdersCount / totalOrders) * 100 : 0;

    return {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      totalRefunds: Math.round(totalRefunds * 100) / 100,
      totalOrders,
      paidOrders: paidOrdersCount,
      refundedOrders: refundedOrdersCount,
      pendingOrders: pendingOrdersCount,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalCustomers,
      totalDownloads,
      activeEntitlements,
      currency: paidOrders[0]?.currency || 'USD',
    };
  }

  /**
   * Get trailing revenue and order count aggregated by date
   */
  static async getRevenueTimeSeries(days: number = 30): Promise<DailySalesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PAID,
        paidAt: { gte: startDate },
      },
      select: {
        paidAt: true,
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Map by date YYYY-MM-DD
    const dateMap = new Map<string, { revenue: number; orderCount: number }>();

    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      dateMap.set(dateKey, { revenue: 0, orderCount: 0 });
    }

    for (const order of orders) {
      const dateKey = (order.paidAt || order.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(dateKey);
      if (existing) {
        existing.revenue += Number(order.total);
        existing.orderCount += 1;
      }
    }

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orderCount: data.orderCount,
    }));
  }

  /**
   * Get top performing products ranked by revenue
   */
  static async getTopProducts(limit: number = 5): Promise<TopProductMetric[]> {
    const paidOrderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: OrderStatus.PAID },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            price: true,
            currency: true,
          },
        },
      },
    });

    const productMap = new Map<string, TopProductMetric>();

    for (const item of paidOrderItems) {
      const p = item.product;
      const existing = productMap.get(p.id);
      const itemRev = Number(item.totalPrice);

      if (existing) {
        existing.unitsSold += 1;
        existing.totalRevenue += itemRev;
      } else {
        productMap.set(p.id, {
          productId: p.id,
          title: p.title,
          slug: p.slug,
          coverImage: p.coverImage,
          currency: p.currency,
          price: Number(p.price),
          unitsSold: 1,
          totalRevenue: itemRev,
        });
      }
    }

    return Array.from(productMap.values())
      .map((item) => ({
        ...item,
        totalRevenue: Math.round(item.totalRevenue * 100) / 100,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  /**
   * Get recent orders for overview stream
   */
  static async getRecentOrders(limit: number = 10) {
    return prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, coverImage: true },
            },
          },
        },
      },
    });
  }

  /**
   * Paginated and filterable order listing
   */
  static async getOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { guestEmail: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
        { customer: { email: { contains: q, mode: 'insensitive' } } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, title: true, slug: true, coverImage: true },
              },
            },
          },
          refunds: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Full order detail with items, transactions, entitlements, and refunds
   */
  static async getOrderDetails(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
        items: {
          include: {
            product: {
              include: {
                files: true,
              },
            },
          },
        },
        transactions: true,
        entitlements: {
          include: {
            product: {
              select: { id: true, title: true, slug: true },
            },
            downloads: true,
          },
        },
        refunds: true,
        couponRedemptions: {
          include: {
            coupon: true,
          },
        },
      },
    });
  }

  /**
   * Admin-initiated order refund and entitlement revocation
   */
  static async processAdminRefund(params: {
    orderId: string;
    reason?: string;
    adminUserId: string;
    refundAmount?: number;
  }) {
    const { orderId, reason, adminUserId, refundAmount } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        transactions: {
          where: { status: 'SUCCESSFUL' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw new Error('Order has already been refunded.');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new Error(`Cannot refund order with status ${order.status}. Only PAID orders can be refunded.`);
    }

    const amountToRefund = refundAmount !== undefined ? refundAmount : Number(order.total);

    // Create refund audit record
    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        transactionId: order.transactions[0]?.id || null,
        amount: amountToRefund,
        currency: order.currency,
        status: 'COMPLETED',
        reason: reason || 'Admin initiated refund',
        requestedBy: adminUserId,
        approvedBy: adminUserId,
      },
    });

    // Transition order state machine (handles entitlement revocation and refund email)
    const updatedOrder = await OrderService.transitionOrderStatus({
      orderId: order.id,
      toStatus: OrderStatus.REFUNDED,
      adminUserId,
      notes: reason || 'Admin initiated refund',
    });

    return {
      order: updatedOrder,
      refund,
    };
  }

  /**
   * Paginated customer list with calculated lifetime spend & active entitlements
   */
  static async getCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ customers: CustomerSummary[]; pagination: PaginationMeta }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orders: {
            where: { status: OrderStatus.PAID },
            select: { total: true },
          },
          _count: {
            select: {
              orders: true,
              entitlements: {
                where: { status: EntitlementStatus.ACTIVE },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const customers: CustomerSummary[] = users.map((user) => {
      const lifetimeSpend = user.orders.reduce(
        (sum, o) => sum + Number(o.total),
        0
      );

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        totalOrders: user._count.orders,
        lifetimeSpend: Math.round(lifetimeSpend * 100) / 100,
        activeEntitlements: user._count.entitlements,
      };
    });

    return {
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Detailed customer profile with orders, entitlements, and download audit
   */
  static async getCustomerDetails(customerId: string) {
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, title: true, slug: true, coverImage: true },
                },
              },
            },
          },
        },
        entitlements: {
          include: {
            product: {
              select: { id: true, title: true, slug: true, coverImage: true },
            },
            downloads: {
              orderBy: { downloadedAt: 'desc' },
              take: 5,
            },
          },
        },
        downloads: {
          orderBy: { downloadedAt: 'desc' },
          take: 20,
          include: {
            productFile: {
              select: { fileName: true, fileSize: true, versionNumber: true },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new Error(`Customer ${customerId} not found.`);
    }

    const paidOrders = customer.orders.filter((o) => o.status === OrderStatus.PAID);
    const lifetimeSpend = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      ...customer,
      lifetimeSpend: Math.round(lifetimeSpend * 100) / 100,
      totalOrders: customer.orders.length,
      paidOrdersCount: paidOrders.length,
    };
  }
}
