import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { OrderStatus, ProductKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { OrderService, OrderValidationError } from '@/services/order/order.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { AnalyticsService } from '@/services/admin/analytics.service';
import { PaymentService } from '@/services/payment/payment.service';
import { SessionService } from '@/services/auth/session.service';

vi.mock('@/lib/prisma', () => {
  const client: any = {
    product: { findMany: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    inventoryReservation: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), update: vi.fn() },
    productVariant: { update: vi.fn(), findUnique: vi.fn() },
    stockMovement: { create: vi.fn() },
    shippingZone: { findFirst: vi.fn().mockResolvedValue(null) },
    coupon: { findUnique: vi.fn(), update: vi.fn() },
    couponRedemption: { create: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    entitlement: { upsert: vi.fn() },
    $executeRaw: vi.fn(),
  };
  client.$transaction = vi.fn((arg: any) => (typeof arg === 'function' ? arg(client) : Promise.all(arg)));
  return { prisma: client };
});

vi.mock('@/services/email/email.service', () => ({
  EmailService: { sendOrderReceiptEmail: vi.fn().mockResolvedValue(true) },
}));

const address = { fullName: 'Ama Mensah', street: '12 Lagos Ave, East Legon', city: 'Accra', country: 'GH', phone: '0241234567' };

function variant(overrides: Record<string, unknown> = {}) {
  return { id: 'var-default', title: 'Default', sku: 'TOTE-D', option1Value: null, price: 200, salePrice: null, inventoryQuantity: 5, reservedQuantity: 0, isAvailable: true, ...overrides };
}

function physicalProduct(variants: unknown[]) {
  return { id: 'tote', title: 'Kente Tote', price: 200, discountPrice: null, currency: 'GHS', productKind: ProductKind.PHYSICAL, isPublished: true, storeId: null, variants };
}

const ebook = { id: 'ebook', title: 'Side-Hustle Playbook', price: 50, discountPrice: null, currency: 'GHS', productKind: ProductKind.DIGITAL, isPublished: true, storeId: null, variants: [] };

describe('Guest checkout: order creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.inventoryReservation.findMany).mockResolvedValue([]);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as any);
    vi.mocked(prisma.order.create).mockImplementation((async (args: any) => ({ id: 'order-1', orderNumber: 'NOV-1', ...args.data })) as any);
  });

  it('uses the hidden default variant, holds stock atomically, charges in GHS and stores the phone', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([physicalProduct([variant()])] as any);

    await OrderService.createOrder({
      guestEmail: 'ama@example.com',
      guestName: 'Ama Mensah',
      contactPhone: '0241234567',
      currency: 'USD',
      items: [{ productId: 'tote', quantity: 2 }],
      shippingAddress: address,
    });

    const data = (vi.mocked(prisma.order.create).mock.calls[0][0] as any).data;
    expect(data.currency).toBe('GHS');
    expect(data.billingAddress).toEqual({ fullName: 'Ama Mensah', email: 'ama@example.com', phone: '0241234567' });
    expect(data.items.create[0]).toMatchObject({ variantId: 'var-default', quantity: 2, unitPrice: 200 });
    expect(data.subtotal).toBe(400);
    expect(data.shippingFee).toBe(30); // Ghana fallback: 25 + 5 for the second item
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
    expect(prisma.inventoryReservation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ variantId: 'var-default', quantity: 2, orderId: 'order-1' }),
    });
  });

  it('asks the buyer to choose when a product has several options', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      physicalProduct([variant({ id: 's', title: 'S', option1Value: 'S' }), variant({ id: 'm', title: 'M', option1Value: 'M' })]),
    ] as any);

    await expect(
      OrderService.createOrder({ guestEmail: 'a@b.com', items: [{ productId: 'tote' }], shippingAddress: address })
    ).rejects.toThrow('Please choose an option');
  });

  it('refuses more than the real available stock', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([physicalProduct([variant({ inventoryQuantity: 5, reservedQuantity: 3 })])] as any);

    const attempt = OrderService.createOrder({ guestEmail: 'a@b.com', items: [{ productId: 'tote', quantity: 3 }], shippingAddress: address });
    await expect(attempt).rejects.toBeInstanceOf(OrderValidationError);
    await expect(attempt).rejects.toThrow('Only 2 of "Kente Tote" left');
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('fails cleanly when the last unit is taken by someone else at the same moment', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([physicalProduct([variant({ inventoryQuantity: 1 })])] as any);
    vi.mocked(prisma.$executeRaw).mockResolvedValue(0 as any);

    await expect(
      OrderService.createOrder({ guestEmail: 'a@b.com', items: [{ productId: 'tote' }], shippingAddress: address })
    ).rejects.toThrow('just sold out');
    expect(prisma.inventoryReservation.create).not.toHaveBeenCalled();
  });

  it('requires a delivery address only for physical items', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([physicalProduct([variant()])] as any);
    await expect(OrderService.createOrder({ guestEmail: 'a@b.com', items: [{ productId: 'tote' }] })).rejects.toThrow(
      'Please enter a delivery address'
    );

    vi.mocked(prisma.product.findMany).mockResolvedValue([ebook] as any);
    await expect(OrderService.createOrder({ guestEmail: 'a@b.com', items: [{ productId: 'ebook', quantity: 4 }] })).resolves.toBeDefined();
    const data = (vi.mocked(prisma.order.create).mock.calls[0][0] as any).data;
    expect(data.items.create[0].quantity).toBe(1);
    expect(data.total).toBe(50);
    expect(data.shippingFee).toBe(0);
  });

  it('never silently ignores a discount code the buyer entered', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([ebook] as any);
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);

    await expect(
      OrderService.createOrder({ guestEmail: 'a@b.com', items: [{ productId: 'ebook' }], couponCode: 'NOPE' })
    ).rejects.toThrow('Invalid or inactive coupon code');
  });
});

describe('Guest checkout: stock goes down when paid', () => {
  const paidOrder = {
    id: 'order-1',
    orderNumber: 'NOV-1',
    status: OrderStatus.PENDING,
    customerId: 'buyer-1',
    guestEmail: null,
    items: [{ productId: 'tote', variantId: 'var-default', quantity: 2, product: { productKind: ProductKind.PHYSICAL } }],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(paidOrder as any);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 });
  });

  it('commits the stock hold made at checkout', async () => {
    vi.mocked(prisma.inventoryReservation.findMany).mockResolvedValue([{ id: 'res-1', variantId: 'var-default', quantity: 2 }] as any);
    const commit = vi.spyOn(InventoryService, 'commitReservation').mockResolvedValue(null);
    const adjust = vi.spyOn(InventoryService, 'adjustStock').mockResolvedValue({} as any);

    await OrderService.transitionOrderStatus({ orderId: 'order-1', toStatus: OrderStatus.PAID });

    expect(commit).toHaveBeenCalledWith('res-1', 'order-1');
    expect(adjust).not.toHaveBeenCalled();
  });

  it('still takes the items out of stock when the buyer paid after the hold expired', async () => {
    vi.mocked(prisma.inventoryReservation.findMany).mockResolvedValue([]);
    const adjust = vi.spyOn(InventoryService, 'adjustStock').mockResolvedValue({} as any);

    await OrderService.transitionOrderStatus({ orderId: 'order-1', toStatus: OrderStatus.PAID });

    expect(adjust).toHaveBeenCalledWith(
      expect.objectContaining({ variantId: 'var-default', quantityChange: -2, movementType: 'ORDER_FULFILLMENT', referenceId: 'order-1' })
    );
  });

  it('selling out does not hide the option from the owner (so it can be restocked)', async () => {
    vi.mocked(prisma.inventoryReservation.findUnique).mockResolvedValue({
      id: 'res-1',
      quantity: 1,
      isReleased: false,
      orderId: 'order-1',
      variant: { id: 'var-default', inventoryQuantity: 1 },
    } as any);

    await InventoryService.commitReservation('res-1', 'order-1');

    const data = (vi.mocked(prisma.productVariant.update).mock.calls[0][0] as any).data;
    expect(data).not.toHaveProperty('isAvailable');
    expect(data.inventoryQuantity).toEqual({ decrement: 1 });
  });
});

describe('Guest checkout API', () => {
  async function post(body: unknown) {
    const { POST } = await import('@/app/api/checkout/create-session/route');
    const res = await POST(new NextRequest('http://localhost:3000/api/checkout/create-session', { method: 'POST', body: JSON.stringify(body) }));
    return { status: res.status, json: await res.json() };
  }

  const valid = {
    items: [{ productId: 'ebook', quantity: 1 }],
    guestName: 'Ama Mensah',
    guestEmail: 'Ama@Example.com',
    phone: '024 123 4567',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requires name, email and phone', async () => {
    expect((await post({ ...valid, phone: '' })).json.error).toMatch(/phone/i);
    expect((await post({ ...valid, guestEmail: 'not-an-email' })).json.error).toMatch(/email/i);
    expect((await post({ ...valid, guestName: '' })).json.error).toMatch(/name/i);
  });

  it('returns friendly 400s the buyer can act on', async () => {
    vi.spyOn(OrderService, 'createOrder').mockRejectedValue(new OrderValidationError('Only 1 of "Kente Tote" left. Please lower the quantity.'));
    const { status, json } = await post(valid);
    expect(status).toBe(400);
    expect(json.error).toBe('Only 1 of "Kente Tote" left. Please lower the quantity.');
  });

  it('always checks out as a guest, even if the owner is logged in', async () => {
    vi.spyOn(SessionService, 'getCurrentSession').mockResolvedValue({ userId: 'owner', email: 'o@x.com', role: 'SUPER_ADMIN' } as any);
    const create = vi.spyOn(OrderService, 'createOrder').mockResolvedValue({ id: 'o1', orderNumber: 'NOV-1', total: 50, currency: 'GHS', status: 'PENDING' } as any);
    vi.spyOn(PaymentService, 'initializeOrderPayment').mockResolvedValue({ paymentUrl: 'https://pay.example/x', transactionRef: 'r', provider: 'PAYSTACK' });

    const { status, json } = await post(valid);

    expect(status).toBe(200);
    expect(json.paymentUrl).toBe('https://pay.example/x');
    const args = create.mock.calls[0][0];
    expect(args.customerId).toBeUndefined();
    expect(args.guestEmail).toBe('ama@example.com');
    expect(args.contactPhone).toBe('024 123 4567');
    expect(PaymentService.initializeOrderPayment).toHaveBeenCalledWith({ orderId: 'o1', provider: 'PAYSTACK' });
  });
});

describe('Admin orders: shipping filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(0);
  });

  it('"To ship" shows paid orders with physical items that are not dispatched', async () => {
    await AnalyticsService.getOrders({ shipping: 'to_ship' });
    expect((vi.mocked(prisma.order.findMany).mock.calls[0][0] as any).where).toEqual({
      items: { some: { productKind: 'PHYSICAL' } },
      status: 'PAID',
      fulfillmentStatus: { in: ['UNFULFILLED', 'PARTIALLY_FULFILLED'] },
    });
  });

  it('"Shipped" shows dispatched physical orders (not digital-only orders)', async () => {
    await AnalyticsService.getOrders({ shipping: 'shipped' });
    expect((vi.mocked(prisma.order.findMany).mock.calls[0][0] as any).where).toEqual({
      items: { some: { productKind: 'PHYSICAL' } },
      fulfillmentStatus: 'FULFILLED',
    });
  });
});
