import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '@/services/inventory/inventory.service';
import { StockMovementType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    productVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    inventoryReservation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((arg) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg);
    }),
  },
}));

describe('InventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adjustStock', () => {
    it('successfully increments inventory stock and records StockMovement ledger entry', async () => {
      const mockVariant = {
        id: 'var-1',
        sku: 'NOV-TSHIRT-L',
        inventoryQuantity: 20,
        reservedQuantity: 2,
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue(mockVariant);
      (prisma.productVariant.update as any).mockResolvedValue({
        ...mockVariant,
        inventoryQuantity: 30,
        isAvailable: true,
      });
      (prisma.stockMovement.create as any).mockResolvedValue({
        id: 'mov-1',
        variantId: 'var-1',
        movementType: StockMovementType.RESTOCK,
        quantityChanged: 10,
        quantityBefore: 20,
        quantityAfter: 30,
      });

      const result = await InventoryService.adjustStock({
        variantId: 'var-1',
        quantityChange: 10,
        movementType: StockMovementType.RESTOCK,
        note: 'Restock shipment received',
      });

      expect(result.variant.inventoryQuantity).toBe(30);
      expect(result.movement.quantityChanged).toBe(10);
      expect(prisma.stockMovement.create).toHaveBeenCalled();
    });
  });

  describe('reserveStock', () => {
    it('reserves inventory quantity if sufficient unreserved stock is available', async () => {
      const mockVariant = {
        id: 'var-1',
        sku: 'NOV-CHRONO-01',
        title: 'Titanium Chrono',
        inventoryQuantity: 10,
        reservedQuantity: 2,
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue(mockVariant);
      (prisma.productVariant.update as any).mockResolvedValue({
        ...mockVariant,
        reservedQuantity: 5,
      });
      (prisma.inventoryReservation.create as any).mockResolvedValue({
        id: 'res-1',
        variantId: 'var-1',
        quantity: 3,
        isReleased: false,
      });

      const reservation = await InventoryService.reserveStock({
        variantId: 'var-1',
        quantity: 3,
        orderId: 'ord-123',
      });

      expect(reservation.quantity).toBe(3);
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-1' },
        data: { reservedQuantity: { increment: 3 } },
      });
    });

    it('throws an error if requested quantity exceeds available stock', async () => {
      const mockVariant = {
        id: 'var-1',
        sku: 'NOV-CHRONO-01',
        title: 'Titanium Chrono',
        inventoryQuantity: 5,
        reservedQuantity: 4,
      };

      (prisma.productVariant.findUnique as any).mockResolvedValue(mockVariant);

      await expect(
        InventoryService.reserveStock({
          variantId: 'var-1',
          quantity: 3,
          orderId: 'ord-123',
        })
      ).rejects.toThrow(/Insufficient stock/);
    });
  });

  describe('getLowStockAlerts', () => {
    it('queries variants with inventory quantity below or equal to threshold', async () => {
      (prisma.productVariant.findMany as any).mockResolvedValue([
        { id: 'var-low', sku: 'LOW-01', inventoryQuantity: 2 },
      ]);

      const alerts = await InventoryService.getLowStockAlerts(5);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].sku).toBe('LOW-01');
    });
  });
});
