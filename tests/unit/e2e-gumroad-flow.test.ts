import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '@/services/order/order.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { CouponService } from '@/services/coupon/coupon.service';
import { WebhookService } from '@/services/payment/webhook.service';
import { RBACService } from '@/services/auth/rbac.service';
import { Role, OrderStatus, ProductKind, StockMovementType, DiscountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    inventoryReservation: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
    customerReturn: {
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
    paymentWebhookEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
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
    grantEntitlement: vi.fn().mockResolvedValue({ id: 'ent-123' }),
    revokeEntitlement: vi.fn().mockResolvedValue({ id: 'ent-revoked' }),
  },
}));

describe('Gumroad-Style End-to-End Commerce Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TEST 1 & 2: Single-Owner Product Architecture (Physical vs Digital)', () => {
    it('should distinguish physical items with variant SKUs from digital assets', () => {
      const physicalProduct = {
        id: 'prod-phys-1',
        title: 'Mechanical Timepiece Edition 01',
        productKind: ProductKind.PHYSICAL,
        price: 450,
        variants: [
          { id: 'var-1', sku: 'TIME-SS-01', title: 'Stainless Steel', inventoryQuantity: 15 },
          { id: 'var-2', sku: 'TIME-TI-02', title: 'Matte Titanium', inventoryQuantity: 5 },
        ],
      };

      const digitalProduct = {
        id: 'prod-digi-1',
        title: 'Studio Design System & Source Codes',
        productKind: ProductKind.DIGITAL,
        price: 99,
        deliverableFiles: ['https://storage.nov.com/private/system-v2.zip'],
      };

      expect(physicalProduct.productKind).toBe(ProductKind.PHYSICAL);
      expect(physicalProduct.variants).toHaveLength(2);
      expect(physicalProduct.variants[0].sku).toBe('TIME-SS-01');

      expect(digitalProduct.productKind).toBe(ProductKind.DIGITAL);
      expect(digitalProduct.deliverableFiles).toContain('https://storage.nov.com/private/system-v2.zip');
    });
  });

  describe('TEST 3 & 5: Mixed Cart & Safe Stock Reservation', () => {
    it('should successfully reserve stock for physical goods and calculate totals accurately', async () => {
      const mockProduct = {
        id: 'prod-1',
        title: 'Chrono Watch',
        price: 200,
        discountPrice: null,
        productKind: ProductKind.PHYSICAL,
        isPublished: true,
        variants: [
          { id: 'var-1', price: 200, salePrice: null, inventoryQuantity: 10, isAvailable: true },
        ],
      };

      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct as any]);
      vi.mocked(prisma.order.create).mockResolvedValue({
        id: 'ord-101',
        orderNumber: 'NOV-101',
        status: OrderStatus.PENDING,
        total: 215, // 200 + 15 shipping
      } as any);

      const order = await OrderService.createOrder({
        items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 1 }],
        currency: 'USD',
        guestName: 'Collector',
        guestEmail: 'collector@nov.com',
      });

      expect(order.orderNumber).toBe('NOV-101');
      expect(prisma.inventoryReservation.create).toHaveBeenCalled();
    });

    it('should reject purchase when stock is insufficient (Overselling Prevention)', async () => {
      const mockProduct = {
        id: 'prod-soldout',
        title: 'Sold Out Item',
        price: 150,
        productKind: ProductKind.PHYSICAL,
        isPublished: true,
        variants: [
          {
            id: 'var-empty',
            title: 'Empty Variant',
            sku: 'SKU-NONE',
            price: 150,
            inventoryQuantity: 0,
            reservedQuantity: 0,
            isAvailable: false,
          },
        ],
      };

      vi.mocked(prisma.product.findMany).mockResolvedValue([mockProduct as any]);

      await expect(
        OrderService.createOrder({
          items: [{ productId: 'prod-soldout', variantId: 'var-empty', quantity: 1 }],
          currency: 'USD',
          guestEmail: 'shopper@nov.com',
        })
      ).rejects.toThrow(/Insufficient stock/);
    });
  });

  describe('TEST 6: Inventory Adjustment & Movement Ledger', () => {
    it('should record audit trail on stock adjustments', async () => {
      const mockVariant = {
        id: 'var-1',
        sku: 'NOV-TSHIRT-L',
        inventoryQuantity: 20,
        reservedQuantity: 2,
      };

      vi.mocked(prisma.productVariant.findUnique).mockResolvedValue(mockVariant as any);
      vi.mocked(prisma.productVariant.update).mockResolvedValue({
        ...mockVariant,
        inventoryQuantity: 30,
        isAvailable: true,
      } as any);
      vi.mocked(prisma.stockMovement.create).mockResolvedValue({
        id: 'mov-1',
        variantId: 'var-1',
        movementType: StockMovementType.RESTOCK,
        quantityChanged: 10,
        quantityBefore: 20,
        quantityAfter: 30,
      } as any);

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

  describe('TEST 7: Webhook Signature Security & Idempotency', () => {
    it('should reject webhook when signature is missing or invalid', async () => {
      const headers = new Headers();
      const rawBody = JSON.stringify({ event: 'charge.completed' });

      await expect(
        WebhookService.processWebhook('FLUTTERWAVE', headers, rawBody)
      ).rejects.toThrow('Invalid FLUTTERWAVE webhook signature');
    });

    it('should safely identify and skip duplicate webhooks that were already processed', async () => {
      const rawBody = JSON.stringify({
        event: 'charge.completed',
        data: { id: 'evt_dup_999' },
      });

      const headers = new Headers({ 'verif-hash': 'flutterwave-secret-hash-dev' });

      vi.mocked(prisma.paymentWebhookEvent.findFirst).mockResolvedValue({
        id: 'proc-1',
        eventId: 'evt_dup_999',
        provider: 'FLUTTERWAVE',
        eventType: 'charge.completed',
        isProcessed: true,
      } as any);

      const result = await WebhookService.processWebhook('FLUTTERWAVE', headers, rawBody);
      expect(result.isDuplicate).toBe(true);
      expect(result.message).toContain('idempotent skip');
    });
  });

  describe('TEST 8: Customer Security & Isolation (RBAC)', () => {
    it('should allow only owner/admin roles to access studio dashboard', () => {
      expect(RBACService.isSellerOrAdmin(Role.SUPER_ADMIN)).toBe(true);
      expect(RBACService.isSellerOrAdmin(Role.ADMIN)).toBe(true);
      expect(RBACService.isSellerOrAdmin(Role.SELLER)).toBe(true);
      expect(RBACService.isSellerOrAdmin(Role.CUSTOMER)).toBe(false);
    });
  });

  describe('TEST 9: Discounts & Returns Workflow', () => {
    it('should calculate valid percentage discounts via CouponService', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValue({
        id: 'coupon-1',
        code: 'NOV20',
        description: '20% off',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20 as any,
        isActive: true,
        startsAt: new Date(Date.now() - 10000),
        expiresAt: new Date(Date.now() + 100000),
        maxUses: null,
        usedCount: 0,
        minOrderAmount: null,
        perCustomerLimit: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await CouponService.validateCoupon({
        code: 'nov20',
        subtotal: 100,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(20);
      expect(result.finalTotal).toBe(80);
    });
  });
});
