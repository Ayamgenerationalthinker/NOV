import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OrderService } from '@/services/order/order.service';
import { OrderNotPayableError, PaymentService } from '@/services/payment/payment.service';
import {
  PaystackAdapter,
  PaymentGatewayUnavailableError,
  fromPaystackSubunits,
  toPaystackSubunits,
} from '@/services/payment/paystack.adapter';
import { FlutterwaveAdapter } from '@/services/payment/flutterwave.adapter';
import { PaymentConfigurationError } from '@/services/payment/simulation';
import { IPaymentAdapter, VerifyPaymentResult } from '@/services/payment/payment.interface';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock('@/services/order/order.service', () => ({
  OrderService: { transitionOrderStatus: vi.fn(), grantDigitalEntitlements: vi.fn() },
}));

const REF = 'PSTK-TMV-1-aaaa1111';

function stored(order: Record<string, any> = {}, tx: Record<string, any> = {}) {
  return {
    id: 'tx-1',
    orderId: 'order-1',
    provider: 'PAYSTACK',
    transactionRef: REF,
    providerRef: null,
    amount: 120,
    currency: 'GHS',
    status: 'INITIALIZED',
    paymentMethod: null,
    ...tx,
    order: {
      id: 'order-1',
      orderNumber: 'TMV-1',
      status: 'PENDING',
      total: 120,
      currency: 'GHS',
      guestEmail: 'buyer@example.com',
      customer: null,
      ...order,
    },
  };
}

function gateway(result: Partial<VerifyPaymentResult> | Error) {
  const verifyPayment =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue({
          success: true,
          amount: 120,
          currency: 'GHS',
          transactionRef: REF,
          providerRef: '9001',
          customerEmail: 'buyer@example.com',
          status: 'SUCCESSFUL',
          ...result,
        });
  const adapter = {
    provider: 'PAYSTACK',
    initializePayment: vi.fn().mockResolvedValue({ paymentUrl: 'https://checkout.paystack.com/x', transactionRef: 'PSTK-new', provider: 'PAYSTACK' }),
    verifyPayment,
    verifyWebhookSignature: vi.fn(),
    parseWebhookEvent: vi.fn(),
  } as unknown as IPaymentAdapter;
  PaymentService.setAdapter('PAYSTACK', adapter);
  return adapter;
}

function paystackResponds(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  PaymentService.setAdapter('PAYSTACK', new PaystackAdapter());
  PaymentService.setAdapter('FLUTTERWAVE', new FlutterwaveAdapter());
});

describe('Paystack amounts', () => {
  it('converts GHS to pesewas and back without float drift', () => {
    expect(toPaystackSubunits(150.5, 'GHS')).toBe(15050);
    expect(toPaystackSubunits(0.1 + 0.2, 'ghs')).toBe(30);
    expect(fromPaystackSubunits(15050, 'GHS')).toBe(150.5);
  });

  it('refuses a currency whose subunit is not confirmed instead of guessing', () => {
    expect(() => toPaystackSubunits(100, 'XOF')).toThrow(PaymentConfigurationError);
    expect(Number.isNaN(fromPaystackSubunits(100, 'XOF'))).toBe(true);
  });

  it('initializes with the subunit amount for the order currency', async () => {
    const fetchMock = paystackResponds(200, { status: true, data: { authorization_url: 'https://checkout.paystack.com/abc' } });
    const adapter = new PaystackAdapter({ secretKey: 'sk_test_x' });

    await adapter.initializePayment({
      orderId: 'o', orderNumber: 'TMV-1', amount: 99.99, currency: 'GHS', customerEmail: 'b@example.com', callbackUrl: 'https://shop/verify',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.amount).toBe(9999);
    expect(body.currency).toBe('GHS');
  });
});

describe('Paystack verification answers', () => {
  it('a Paystack server error is "unavailable", never a failed payment', async () => {
    paystackResponds(503, { status: false, message: 'Service unavailable' });
    await expect(new PaystackAdapter({ secretKey: 'sk_test_x' }).verifyPayment(REF)).rejects.toBeInstanceOf(
      PaymentGatewayUnavailableError
    );
  });

  it('a network error is "unavailable"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(new PaystackAdapter({ secretKey: 'sk_test_x' }).verifyPayment(REF)).rejects.toBeInstanceOf(
      PaymentGatewayUnavailableError
    );
  });

  it('a rejected secret key is a configuration error', async () => {
    paystackResponds(401, { status: false, message: 'Invalid key' });
    await expect(new PaystackAdapter({ secretKey: 'sk_live_wrong' }).verifyPayment(REF)).rejects.toBeInstanceOf(
      PaymentConfigurationError
    );
  });

  it('an abandoned checkout (buyer closed the window) is pending, not failed', async () => {
    paystackResponds(200, { status: true, data: { status: 'abandoned', reference: REF, amount: 12000, currency: 'GHS', id: 1 } });
    const result = await new PaystackAdapter({ secretKey: 'sk_test_x' }).verifyPayment(REF);
    expect(result.success).toBe(false);
    expect(result.status).toBe('PENDING');
  });

  it('a declined charge is failed; a successful one carries amount in major units', async () => {
    paystackResponds(200, { status: true, data: { status: 'failed', reference: REF, amount: 12000, currency: 'GHS', id: 1 } });
    expect((await new PaystackAdapter({ secretKey: 'sk_test_x' }).verifyPayment(REF)).status).toBe('FAILED');

    paystackResponds(200, {
      status: true,
      data: { status: 'success', reference: REF, amount: 12000, currency: 'GHS', id: 77, customer: { email: 'b@example.com' } },
    });
    const ok = await new PaystackAdapter({ secretKey: 'sk_test_x' }).verifyPayment(REF);
    expect(ok).toMatchObject({ success: true, status: 'SUCCESSFUL', amount: 120, currency: 'GHS', providerRef: '77' });
  });
});

describe('PaymentService.confirmOrderPayment', () => {
  it('a gateway outage leaves the transaction untouched and grants nothing', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored() as any);
    gateway(new PaymentGatewayUnavailableError('down'));

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result).toMatchObject({ outcome: 'REJECTED', reason: 'GATEWAY_ERROR' });
    expect(prisma.transaction.update).not.toHaveBeenCalled();
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a payment made by someone other than the order buyer', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored() as any);
    gateway({ customerEmail: 'someone.else@example.com' });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'webhook' });

    expect(result).toMatchObject({ outcome: 'REJECTED', reason: 'CUSTOMER_MISMATCH' });
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('matches the payer email case-insensitively', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored() as any);
    gateway({ customerEmail: 'Buyer@Example.com ' });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });
    expect(result.outcome).toBe('PAID');
  });

  it('repairs access for an order that is already PAID (e.g. an earlier confirmation crashed)', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored({ status: 'PAID' }) as any);
    const adapter = gateway({});

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'webhook' });

    expect(result.outcome).toBe('ALREADY_PAID');
    expect(OrderService.grantDigitalEntitlements).toHaveBeenCalledWith('order-1');
    expect(adapter.verifyPayment).not.toHaveBeenCalled();
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });
});

describe('Re-checking and retrying payments', () => {
  it('"Check again" marks the order paid only when the gateway confirms an earlier attempt', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([{ transactionRef: REF, provider: 'PAYSTACK' }] as any);
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored() as any);
    gateway({});

    const result = await PaymentService.recheckOrderPayment('order-1');

    expect(result?.outcome).toBe('PAID');
    expect(OrderService.transitionOrderStatus).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1', toStatus: 'PAID' }));
  });

  it('"Check again" on a still-unpaid attempt changes nothing', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([{ transactionRef: REF, provider: 'PAYSTACK' }] as any);
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored() as any);
    gateway({ success: false, status: 'PENDING' });

    const result = await PaymentService.recheckOrderPayment('order-1');

    expect(result?.outcome).toBe('PENDING');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('"Try again" does not start a second charge when an earlier attempt already succeeded', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-1', orderNumber: 'TMV-1', status: 'PENDING', total: 120, currency: 'GHS', guestEmail: 'buyer@example.com', customer: null,
    } as any);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([{ transactionRef: REF, provider: 'PAYSTACK' }] as any);
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(stored() as any);
    const adapter = gateway({});

    await expect(PaymentService.initializeOrderPayment({ orderId: 'order-1', provider: 'PAYSTACK' })).rejects.toBeInstanceOf(
      OrderNotPayableError
    );
    expect(adapter.initializePayment).not.toHaveBeenCalled();
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('refuses to start a payment for a paid order', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 'order-1', orderNumber: 'TMV-1', status: 'PAID' } as any);
    const adapter = gateway({});

    await expect(PaymentService.initializeOrderPayment({ orderId: 'order-1', provider: 'PAYSTACK' })).rejects.toThrow(/already paid/);
    expect(adapter.initializePayment).not.toHaveBeenCalled();
  });

  it('a new attempt always charges the stored order total, never a browser amount', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-1', orderNumber: 'TMV-1', status: 'PENDING', total: 120, currency: 'GHS', guestEmail: 'buyer@example.com', customer: null,
    } as any);
    const adapter = gateway({});

    await PaymentService.initializeOrderPayment({ orderId: 'order-1', provider: 'PAYSTACK' });

    expect(adapter.initializePayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 120, currency: 'GHS', customerEmail: 'buyer@example.com' }));
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 120, currency: 'GHS', status: 'INITIALIZED' }) })
    );
  });
});
