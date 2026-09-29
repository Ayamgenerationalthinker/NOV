import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShippingService } from '@/services/shipping/shipping.service';
import { FulfillmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
    shippingZone: {
      findFirst: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    fulfillment: {
      create: vi.fn(),
    },
    returnRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((arg) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      return Promise.all(arg);
    }),
  },
}));

describe('ShippingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateShippingFee', () => {
    it('returns 0 shipping fee and instant delivery for purely digital orders', async () => {
      (prisma.product.findMany as any).mockResolvedValue([
        { id: 'prod-digital', productKind: 'DIGITAL' },
      ]);

      const result = await ShippingService.calculateShippingFee({
        countryCode: 'GH',
        items: [{ productId: 'prod-digital', quantity: 1 }],
      });

      expect(result.shippingFee).toBe(0);
      expect(result.method).toBe('Instant Digital Delivery');
    });

    it('calculates physical shipping fee based on matching shipping zone', async () => {
      (prisma.product.findMany as any).mockResolvedValue([
        { id: 'prod-physical', productKind: 'PHYSICAL' },
      ]);

      (prisma.shippingZone.findFirst as any).mockResolvedValue({
        id: 'zone-gh',
        name: 'Ghana Domestic Dispatch',
        baseRate: 25.0,
        perItemRate: 5.0,
        estimatedDaysMin: 1,
        estimatedDaysMax: 3,
      });

      const result = await ShippingService.calculateShippingFee({
        countryCode: 'GH',
        items: [{ productId: 'prod-physical', quantity: 3 }],
      });

      // 25 base + (3 - 1) * 5 = 35
      expect(result.shippingFee).toBe(35);
      expect(result.method).toBe('Ghana Domestic Dispatch');
    });
  });

  describe('createOrUpdateFulfillment', () => {
    it('creates a fulfillment record and updates order items', async () => {
      const mockOrder = {
        id: 'ord-1',
        storeId: 'store-1',
        items: [{ id: 'item-1', productKind: 'PHYSICAL' }],
      };

      (prisma.order.findUnique as any).mockResolvedValue(mockOrder);
      (prisma.fulfillment.create as any).mockResolvedValue({
        id: 'ful-1',
        orderId: 'ord-1',
        trackingNumber: 'GH-99823',
        status: FulfillmentStatus.FULFILLED,
      });

      const fulfillment = await ShippingService.createOrUpdateFulfillment({
        orderId: 'ord-1',
        trackingNumber: 'GH-99823',
        trackingCarrier: 'Ghana Post EMS',
      });

      expect(fulfillment.trackingNumber).toBe('GH-99823');
      expect(prisma.orderItem.updateMany).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalled();
    });
  });
});
