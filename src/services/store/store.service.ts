import { prisma } from '@/lib/prisma';
import { Prisma, OrderStatus, FulfillmentStatus } from '@prisma/client';

export interface StoreUpsertInput {
  sellerId: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  brandColor?: string;
  policyShipping?: string;
  policyReturns?: string;
}

export class StoreService {
  /**
   * Slugify helper for store names
   */
  static slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get store profile by seller user ID
   */
  static async getStoreBySellerId(sellerId: string) {
    return prisma.store.findUnique({
      where: { sellerId },
      include: {
        _count: {
          select: { products: true, orders: true, fulfillments: true },
        },
      },
    });
  }

  /**
   * Get public store profile by URL slug
   */
  static async getStoreBySlug(slug: string) {
    return prisma.store.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isPublished: true },
          include: {
            variants: true,
            categories: { include: { category: true } },
          },
        },
      },
    });
  }

  /**
   * Create or update store profile for a seller
   */
  static async upsertStore(data: StoreUpsertInput) {
    const slug = data.slug || this.slugify(data.name);

    return prisma.store.upsert({
      where: { sellerId: data.sellerId },
      create: {
        sellerId: data.sellerId,
        name: data.name,
        slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
        brandColor: data.brandColor || '#000000',
        policyShipping: data.policyShipping || null,
        policyReturns: data.policyReturns || null,
      },
      update: {
        name: data.name,
        slug,
        description: data.description,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        brandColor: data.brandColor,
        policyShipping: data.policyShipping,
        policyReturns: data.policyReturns,
      },
    });
  }

  /**
   * Comprehensive seller dashboard analytics scoped to seller's store
   */
  static async getSellerDashboardMetrics(sellerId: string) {
    const store = await prisma.store.findUnique({ where: { sellerId } });
    if (!store) {
      return {
        revenue: 0,
        ordersCount: 0,
        productsCount: 0,
        lowStockCount: 0,
        pendingFulfillmentsCount: 0,
        recentOrders: [],
        topProducts: [],
      };
    }

    const [orders, products, lowStockVariants, pendingFulfillments] = await Promise.all([
      prisma.order.findMany({
        where: {
          storeId: store.id,
          status: OrderStatus.PAID,
        },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.product.count({
        where: { storeId: store.id },
      }),
      prisma.productVariant.count({
        where: {
          product: { storeId: store.id },
          inventoryQuantity: { lte: 5 },
        },
      }),
      prisma.fulfillment.count({
        where: {
          storeId: store.id,
          status: FulfillmentStatus.UNFULFILLED,
        },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);

    return {
      revenue: Math.round(totalRevenue * 100) / 100,
      ordersCount: orders.length,
      productsCount: products,
      lowStockCount: lowStockVariants,
      pendingFulfillmentsCount: pendingFulfillments,
      recentOrders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        total: Number(o.total),
        currency: o.currency,
        status: o.status,
        fulfillmentStatus: o.fulfillmentStatus,
        createdAt: o.createdAt,
        customerName: o.guestName || 'Customer',
        itemsCount: o.items.length,
      })),
      topProducts: [],
    };
  }
}
