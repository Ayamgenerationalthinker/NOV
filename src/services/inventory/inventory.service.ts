import { prisma } from '@/lib/prisma';
import { StockMovementType, Prisma } from '@prisma/client';

export interface StockAdjustmentInput {
  variantId: string;
  quantityChange: number;
  movementType: StockMovementType;
  referenceId?: string;
  note?: string;
  performedBy?: string;
}

export class InventoryService {
  /**
   * Adjust inventory stock for a variant with full atomic ledger recording
   */
  static async adjustStock({
    variantId,
    quantityChange,
    movementType,
    referenceId,
    note,
    performedBy,
  }: StockAdjustmentInput) {
    return prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new Error(`Variant ${variantId} not found.`);
      }

      const quantityBefore = variant.inventoryQuantity;
      const quantityAfter = Math.max(0, quantityBefore + quantityChange);

      const updatedVariant = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          inventoryQuantity: quantityAfter,
          isAvailable: quantityAfter > 0,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          variantId,
          movementType,
          quantityChanged: quantityChange,
          quantityBefore,
          quantityAfter,
          referenceId,
          note,
          performedBy,
        },
      });

      return { variant: updatedVariant, movement };
    });
  }

  /**
   * Reserve stock during checkout with an expiration window (default: 15 minutes)
   */
  static async reserveStock({
    variantId,
    quantity,
    orderId,
    sessionId,
    expiresMinutes = 15,
  }: {
    variantId: string;
    quantity: number;
    orderId?: string;
    sessionId?: string;
    expiresMinutes?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new Error(`Product variant ${variantId} not found.`);
      }

      const availableStock = variant.inventoryQuantity - variant.reservedQuantity;
      if (availableStock < quantity) {
        throw new Error(
          `Insufficient stock for ${variant.title} (SKU: ${variant.sku}). Available: ${Math.max(0, availableStock)}, Requested: ${quantity}.`
        );
      }

      const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

      // Increment reserved count
      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          reservedQuantity: { increment: quantity },
        },
      });

      const reservation = await tx.inventoryReservation.create({
        data: {
          variantId,
          quantity,
          orderId,
          sessionId,
          expiresAt,
        },
      });

      return reservation;
    });
  }

  /**
   * Commit reservation upon successful payment verification
   */
  static async commitReservation(reservationId: string, orderId?: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({
        where: { id: reservationId },
        include: { variant: true },
      });

      if (!reservation || reservation.isReleased) return null;

      const variant = reservation.variant;
      const quantity = reservation.quantity;

      // Decrement both reservedQuantity and inventoryQuantity, increment soldQuantity
      const updatedVariant = await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          reservedQuantity: { decrement: quantity },
          inventoryQuantity: { decrement: quantity },
          soldQuantity: { increment: quantity },
          // isAvailable stays as the owner set it: selling out must not hide an option (it could no
          // longer be restocked from the product form). Availability comes from the stock numbers.
        },
      });

      await tx.stockMovement.create({
        data: {
          variantId: variant.id,
          movementType: StockMovementType.ORDER_FULFILLMENT,
          quantityChanged: -quantity,
          quantityBefore: variant.inventoryQuantity,
          quantityAfter: variant.inventoryQuantity - quantity,
          referenceId: orderId || reservation.orderId,
          note: `Order purchase commitment`,
        },
      });

      await tx.inventoryReservation.update({
        where: { id: reservationId },
        data: { isReleased: true },
      });

      return updatedVariant;
    });
  }

  /**
   * Release an active reservation (e.g. cancelled order or checkout abandonment)
   */
  static async releaseReservation(reservationId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.inventoryReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation || reservation.isReleased) return null;

      await tx.productVariant.update({
        where: { id: reservation.variantId },
        data: {
          reservedQuantity: { decrement: reservation.quantity },
        },
      });

      return tx.inventoryReservation.update({
        where: { id: reservationId },
        data: { isReleased: true },
      });
    });
  }

  /**
   * Automatically release all expired unreleased inventory reservations
   */
  static async releaseExpiredReservations() {
    const expired = await prisma.inventoryReservation.findMany({
      where: {
        isReleased: false,
        expiresAt: { lt: new Date() },
      },
    });

    let releasedCount = 0;
    for (const res of expired) {
      await this.releaseReservation(res.id);
      releasedCount++;
    }

    return { releasedCount };
  }

  /**
   * Query low stock variants (for inventory dashboard and alerts)
   */
  static async getLowStockAlerts(threshold: number = 5, storeId?: string) {
    const where: Prisma.ProductVariantWhereInput = {
      inventoryQuantity: { lte: threshold },
    };

    if (storeId) {
      where.product = { storeId };
    }

    return prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: { id: true, title: true, slug: true, coverImage: true, storeId: true },
        },
      },
      orderBy: { inventoryQuantity: 'asc' },
    });
  }

  /**
   * Get stock movement audit history
   */
  static async getStockHistory(variantId?: string, limit: number = 50) {
    const where: Prisma.StockMovementWhereInput = {};
    if (variantId) where.variantId = variantId;

    return prisma.stockMovement.findMany({
      where,
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
