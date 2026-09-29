import { prisma } from '@/lib/prisma';
import { FulfillmentStatus, ReturnStatus, StockMovementType, Prisma } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';

export interface ShippingCalculationParams {
  countryCode: string;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    weightGrams?: number;
  }>;
}

export class ShippingService {
  /**
   * Calculate dynamic shipping fee based on delivery destination and physical items
   */
  static async calculateShippingFee({ countryCode, items }: ShippingCalculationParams) {
    if (!items || items.length === 0) {
      return { shippingFee: 0, estimatedDaysMin: 2, estimatedDaysMax: 5, method: 'Digital Delivery' };
    }

    // Fetch product kinds to filter only physical items
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, productKind: true, shippingProfileId: true },
    });

    const physicalProducts = products.filter((p) => p.productKind === 'PHYSICAL');

    // If order contains no physical items, shipping is free and instant
    if (physicalProducts.length === 0) {
      return { shippingFee: 0, estimatedDaysMin: 0, estimatedDaysMax: 0, method: 'Instant Digital Delivery' };
    }

    const totalPhysicalItems = items
      .filter((i) => physicalProducts.some((p) => p.id === i.productId))
      .reduce((sum, i) => sum + i.quantity, 0);

    // Retrieve active shipping zone matching country
    const zone = await prisma.shippingZone.findFirst({
      where: {
        countries: { has: countryCode.toUpperCase() },
      },
      orderBy: { baseRate: 'asc' },
    });

    if (!zone) {
      // Default fallback standard shipping calculation (e.g. Ghana / Domestic base rate vs International)
      const isDomestic = countryCode.toUpperCase() === 'GH';
      const base = isDomestic ? 25 : 120; // 25 GHS / standard vs international
      const perItem = isDomestic ? 5 : 20;
      const fee = base + Math.max(0, totalPhysicalItems - 1) * perItem;

      return {
        shippingFee: Math.round(fee * 100) / 100,
        estimatedDaysMin: isDomestic ? 1 : 5,
        estimatedDaysMax: isDomestic ? 3 : 10,
        method: isDomestic ? 'Standard Express Dispatch (Ghana)' : 'International Courier Dispatch',
      };
    }

    const baseRate = Number(zone.baseRate);
    const perItemRate = Number(zone.perItemRate);
    const calculatedFee = baseRate + Math.max(0, totalPhysicalItems - 1) * perItemRate;

    return {
      shippingFee: Math.round(calculatedFee * 100) / 100,
      estimatedDaysMin: zone.estimatedDaysMin,
      estimatedDaysMax: zone.estimatedDaysMax,
      method: zone.name,
    };
  }

  /**
   * Create or update fulfillment record for physical orders
   */
  static async createOrUpdateFulfillment({
    orderId,
    storeId,
    trackingNumber,
    trackingCarrier,
    trackingUrl,
    status = FulfillmentStatus.FULFILLED,
    notes,
  }: {
    orderId: string;
    storeId?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    trackingUrl?: string;
    status?: FulfillmentStatus;
    notes?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found.`);
      }

      const fulfillment = await tx.fulfillment.create({
        data: {
          orderId,
          storeId: storeId || order.storeId,
          status,
          trackingNumber,
          trackingCarrier,
          trackingUrl,
          dispatchedAt: status === FulfillmentStatus.FULFILLED ? new Date() : undefined,
          notes,
        },
      });

      // Update physical order items with fulfillment status
      await tx.orderItem.updateMany({
        where: {
          orderId,
          productKind: 'PHYSICAL',
        },
        data: {
          fulfillmentId: fulfillment.id,
          fulfillmentStatus: status,
        },
      });

      // Check if all items in order are fulfilled
      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: status,
        },
      });

      return fulfillment;
    });
  }

  /**
   * Submit customer return request
   */
  static async requestReturn({
    orderId,
    orderItemId,
    customerId,
    reason,
    customerComment,
  }: {
    orderId: string;
    orderItemId: string;
    customerId: string;
    reason: string;
    customerComment?: string;
  }) {
    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!item || item.orderId !== orderId) {
      throw new Error(`Order item ${orderItemId} does not belong to order ${orderId}.`);
    }

    if (item.order.customerId !== customerId) {
      throw new Error(`Unauthorized return request for customer ${customerId}.`);
    }

    return prisma.returnRequest.create({
      data: {
        orderId,
        orderItemId,
        customerId,
        storeId: item.order.storeId,
        status: ReturnStatus.REQUESTED,
        reason,
        customerComment,
        refundAmount: item.totalPrice,
      },
    });
  }

  /**
   * Process and update return request status with optional stock restoration
   */
  static async processReturn({
    returnId,
    status,
    sellerResponse,
    returnTrackingNumber,
    restockInventory = false,
  }: {
    returnId: string;
    status: ReturnStatus;
    sellerResponse?: string;
    returnTrackingNumber?: string;
    restockInventory?: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const returnReq = await tx.returnRequest.findUnique({
        where: { id: returnId },
        include: { orderItem: true },
      });

      if (!returnReq) {
        throw new Error(`Return request ${returnId} not found.`);
      }

      // Restock inventory if received & approved
      if (restockInventory && !returnReq.isRestocked && returnReq.orderItem.variantId) {
        await InventoryService.adjustStock({
          variantId: returnReq.orderItem.variantId,
          quantityChange: returnReq.orderItem.quantity,
          movementType: StockMovementType.RETURN_RESTOCK,
          referenceId: returnId,
          note: `Restocked upon customer return approval`,
        });
      }

      const updated = await tx.returnRequest.update({
        where: { id: returnId },
        data: {
          status,
          sellerResponse: sellerResponse || returnReq.sellerResponse,
          returnTrackingNumber: returnTrackingNumber || returnReq.returnTrackingNumber,
          isRestocked: restockInventory ? true : returnReq.isRestocked,
        },
      });

      return updated;
    });
  }
}
