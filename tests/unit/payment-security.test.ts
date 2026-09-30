import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadEnv } from '@/lib/env';
import { OrderService } from '@/services/order/order.service';
import { PaymentService } from '@/services/payment/payment.service';
import { PaystackAdapter } from '@/services/payment/paystack.adapter';
import { FlutterwaveAdapter } from '@/services/payment/flutterwave.adapter';
import { PaymentConfigurationError } from '@/services/payment/simulation';
import { IPaymentAdapter, VerifyPaymentResult } from '@/services/payment/payment.interface';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/services/order/order.service', () => ({
  OrderService: {
    transitionOrderStatus: vi.fn(),
  },
}));

const REF = 'PSTK-NOV-100-a1b2c3d4';

function storedTransaction(overrides: Record<string, any> = {}, orderOverrides: Record<string, any> = {}) {
  return {
    id: 'tx-1',
    orderId: 'order-1',
    provider: 'PAYSTACK',
    transactionRef: REF,
    providerRef: null,
    amount: 150,
    currency: 'GHS',
    status: 'INITIALIZED',
    paymentMethod: null,
    rawPayload: null,
    ...overrides,
    order: {
      id: 'order-1',
      orderNumber: 'NOV-100',
      status: 'PENDING',
      total: 150,
      currency: 'GHS',
      ...orderOverrides,
    },
  };
}

/** Install a fake Paystack adapter whose gateway answer we control. */
function gatewayReturns(result: Partial<VerifyPaymentResult> | Error) {
  const verifyPayment =
    result instanceof Error
      ? vi.fn().mockRejectedValue(result)
      : vi.fn().mockResolvedValue({
          success: true,
          amount: 150,
          currency: 'GHS',
          transactionRef: REF,
          providerRef: '5550001',
          status: 'SUCCESSFUL',
          ...result,
        });
  const adapter = {
    provider: 'PAYSTACK',
    initializePayment: vi.fn(),
    verifyPayment,
    verifyWebhookSignature: vi.fn(),
    parseWebhookEvent: vi.fn(),
  } as unknown as IPaymentAdapter;
  PaymentService.setAdapter('PAYSTACK', adapter);
  return verifyPayment;
}

function mockFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  PaymentService.setAdapter('PAYSTACK', new PaystackAdapter());
  PaymentService.setAdapter('FLUTTERWAVE', new FlutterwaveAdapter());
});

describe('Bypass 1: simulated / keyless verification in the adapters', () => {
  it('Paystack: production + PAYMENT_SIMULATION=true + no key + PSTK-sim- reference fails loudly', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    const adapter = new PaystackAdapter({ secretKey: undefined });

    await expect(adapter.verifyPayment('PSTK-sim-NOV-1-abcd')).rejects.toBeInstanceOf(PaymentConfigurationError);
  });

  it('Paystack: missing key without the simulation flag fails loudly, even outside production', async () => {
    const adapter = new PaystackAdapter({ secretKey: undefined });
    await expect(adapter.verifyPayment('PSTK-sim-NOV-1-abcd')).rejects.toBeInstanceOf(PaymentConfigurationError);
    await expect(adapter.verifyPayment(REF)).rejects.toBeInstanceOf(PaymentConfigurationError);
  });

  it('Paystack: production never hands out a simulated checkout URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    const adapter = new PaystackAdapter({ secretKey: undefined });

    await expect(
      adapter.initializePayment({
        orderId: 'o',
        orderNumber: 'NOV-1',
        amount: 10,
        currency: 'GHS',
        customerEmail: 'a@b.com',
        callbackUrl: 'http://x',
      })
    ).rejects.toBeInstanceOf(PaymentConfigurationError);
  });

  it('Paystack: with a real key, a PSTK-sim- reference is checked with the gateway (no shortcut)', async () => {
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    const fetchMock = mockFetch({ status: false, message: 'Transaction reference not found' }, false);
    const adapter = new PaystackAdapter({ secretKey: 'sk_test_x' });

    const result = await adapter.verifyPayment('PSTK-sim-NOV-1-abcd');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.success).toBe(false);
  });

  it('Paystack: simulation mode only accepts simulated references', async () => {
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    const adapter = new PaystackAdapter({ secretKey: undefined });

    expect((await adapter.verifyPayment(REF)).success).toBe(false);
    expect((await adapter.verifyPayment('PSTK-sim-NOV-1-abcd')).success).toBe(true);
  });

  it('Flutterwave: production + PAYMENT_SIMULATION=true + no key fails loudly', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    const adapter = new FlutterwaveAdapter({ secretKey: undefined });

    await expect(adapter.verifyPayment('FLW-sim-NOV-1-abcd')).rejects.toBeInstanceOf(PaymentConfigurationError);
    await expect(adapter.verifyPayment('sim_12345')).rejects.toBeInstanceOf(PaymentConfigurationError);
  });

  it('Flutterwave: with a real key, a sim_ reference is checked with the gateway (no shortcut)', async () => {
    const fetchMock = mockFetch({ status: 'error', message: 'No transaction was found' }, false);
    const adapter = new FlutterwaveAdapter({ secretKey: 'FLWSECK_TEST-x' });

    const result = await adapter.verifyPayment('sim_12345');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('verify_by_reference?tx_ref=sim_12345');
    expect(result.success).toBe(false);
  });

  it('Webhook signatures: no configured secret means no webhook is trusted (old dev defaults rejected)', async () => {
    const crypto = await import('crypto');
    const body = '{"event":"charge.success"}';
    const forged = crypto.createHmac('sha512', 'paystack-secret-dev').update(body).digest('hex');

    expect(new PaystackAdapter({ secretKey: undefined }).verifyWebhookSignature(new Headers({ 'x-paystack-signature': forged }), body)).toBe(false);
    expect(
      new FlutterwaveAdapter({ secretKey: undefined, webhookSecret: undefined }).verifyWebhookSignature(
        new Headers({ 'verif-hash': 'flutterwave-secret-hash-dev' }),
        body
      )
    ).toBe(false);
  });
});

describe('Bypass 2: PaymentService.confirmOrderPayment checks', () => {
  it('rejects a reference that does not match any stored transaction', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(null);
    const verify = gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({ reference: 'test_simulated_1', source: 'redirect' });

    expect(result.outcome).toBe('REJECTED');
    expect(result.reason).toBe('UNKNOWN_REFERENCE');
    expect(verify).not.toHaveBeenCalled();
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a valid paid reference presented for a different order', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({
      reference: REF,
      expectedOrderId: 'order-expensive',
      source: 'redirect',
    });

    expect(result.reason).toBe('ORDER_MISMATCH');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a reference checked against the wrong provider', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({ reference: REF, provider: 'FLUTTERWAVE', source: 'webhook' });

    expect(result.reason).toBe('PROVIDER_MISMATCH');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('does not mark PAID when the gateway says the payment failed', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({ success: false, status: 'FAILED' });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.outcome).toBe('FAILED');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects when the gateway answers for a different reference', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({ transactionRef: 'PSTK-SOMEONE-ELSE' });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('REFERENCE_MISMATCH');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects an underpayment and marks the transaction FAILED', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({ amount: 1 });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('AMOUNT_MISMATCH');
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tx-1' }, data: expect.objectContaining({ status: 'FAILED' }) })
    );
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects when the stored transaction amount does not match the order total', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction({ amount: 1 }) as any);
    gatewayReturns({ amount: 1 });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('AMOUNT_MISMATCH');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a payment in the wrong currency', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({ currency: 'NGN' });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('CURRENCY_MISMATCH');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a gateway transaction that is already attached to another order', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue({ id: 'tx-other', orderId: 'order-other' } as any);
    gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('REFERENCE_REUSED');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('rejects a simulated gateway answer in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({ simulated: true, amount: NaN, currency: '' });

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('SIMULATION_NOT_ALLOWED');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('fails loudly (throws) when the gateway key is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    PaymentService.setAdapter('PAYSTACK', new PaystackAdapter({ secretKey: undefined }));
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);

    await expect(PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' })).rejects.toBeInstanceOf(
      PaymentConfigurationError
    );
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('refuses to pay a cancelled order', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction({}, { status: 'CANCELLED' }) as any);
    gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'redirect' });

    expect(result.reason).toBe('ORDER_NOT_PAYABLE');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('does not re-run payment side effects for an already paid order', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction({ status: 'SUCCESSFUL' }, { status: 'PAID' }) as any);
    const verify = gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({ reference: REF, source: 'webhook' });

    expect(result.outcome).toBe('ALREADY_PAID');
    expect(verify).not.toHaveBeenCalled();
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('marks PAID only when every check passes', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({});

    const result = await PaymentService.confirmOrderPayment({
      reference: REF,
      provider: 'PAYSTACK',
      expectedOrderId: 'order-1',
      source: 'redirect',
    });

    expect(result.outcome).toBe('PAID');
    expect(OrderService.transitionOrderStatus).toHaveBeenCalledOnce();
    expect(OrderService.transitionOrderStatus).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', toStatus: 'PAID', transactionRef: REF })
    );
  });

  it('allows a simulated payment only outside production with PAYMENT_SIMULATION=true', async () => {
    vi.stubEnv('PAYMENT_SIMULATION', 'true');
    const simRef = 'PSTK-sim-NOV-100-abcd';
    PaymentService.setAdapter('PAYSTACK', new PaystackAdapter({ secretKey: undefined }));
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction({ transactionRef: simRef }) as any);

    const result = await PaymentService.confirmOrderPayment({ reference: simRef, source: 'redirect' });

    expect(result.outcome).toBe('PAID');
  });
});

describe('Bypass 3: /api/payments/verify redirect route', () => {
  async function callVerify(query: string) {
    const { GET } = await import('@/app/api/payments/verify/route');
    const res = await GET(new NextRequest(`http://localhost:3000/api/payments/verify?${query}`));
    return res.headers.get('location') || '';
  }

  const payableOrder = { id: 'order-1', orderNumber: 'NOV-100', status: 'PENDING', total: 150, currency: 'GHS' };

  it('rejects the old test_simulated_ shortcut', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(payableOrder as any);

    const location = await callVerify('provider=PAYSTACK&reference=test_simulated_123&order_id=order-1');

    expect(location).toContain('/checkout?error=');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('ignores a spoofed status=successful and sim_ transaction_id from the URL', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.order.findUnique).mockResolvedValue(payableOrder as any);

    const location = await callVerify('provider=FLUTTERWAVE&status=successful&transaction_id=sim_999&order_id=order-1');

    expect(location).toContain('/checkout?error=');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('will not mark order B paid using the reference of cheaper order A', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({});

    const location = await callVerify(`provider=PAYSTACK&reference=${REF}&order_id=order-B`);

    expect(location).toContain('error=payment_verification_failed');
    expect(OrderService.transitionOrderStatus).not.toHaveBeenCalled();
  });

  it('redirects to the success page after a fully verified payment', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(storedTransaction() as any);
    gatewayReturns({});

    const location = await callVerify(`provider=PAYSTACK&reference=${REF}&order_id=order-1`);

    expect(location).toContain('/checkout/success?orderId=order-1');
    expect(OrderService.transitionOrderStatus).toHaveBeenCalledOnce();
  });
});

describe('Bypass 4: admin login backdoor and forgeable sessions', () => {
  it('rejects the old hard-coded owner@nov.com account when it is not in the database', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const { POST } = await import('@/app/api/auth/login/route');

    const res = await POST(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'owner@nov.com', password: 'OwnerPassword123!' }),
      })
    );

    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('refuses to boot in production without a real AUTH_SECRET', () => {
    const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://x', NEXT_PUBLIC_APP_URL: 'https://shop.example.com' };

    expect(() => loadEnv({ ...base } as any)).toThrow(/AUTH_SECRET/);
    expect(() => loadEnv({ ...base, AUTH_SECRET: 'dev-auth-secret-for-local-testing-32-chars-long' } as any)).toThrow(/AUTH_SECRET/);
    expect(() => loadEnv({ ...base, AUTH_SECRET: 'short' } as any)).toThrow(/AUTH_SECRET/);
    expect(loadEnv({ ...base, AUTH_SECRET: 'a'.repeat(48) } as any).AUTH_SECRET).toBe('a'.repeat(48));
  });

  it('does not wipe payment keys when an unrelated variable is invalid (dev)', () => {
    const parsed = loadEnv({
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'not-a-url',
      PAYSTACK_SECRET_KEY: 'sk_test_keep_me',
    } as any);

    expect(parsed.PAYSTACK_SECRET_KEY).toBe('sk_test_keep_me');
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('refuses to boot in production when any variable is invalid', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://x',
        NEXT_PUBLIC_APP_URL: 'not-a-url',
        AUTH_SECRET: 'a'.repeat(48),
      } as any)
    ).toThrow(/Invalid environment variables/);
  });
});

describe('Environment: blank values count as unset', () => {
  it('ignores KEY="" so defaults apply in dev and production still refuses a blank AUTH_SECRET', () => {
    const dev = loadEnv({ NODE_ENV: 'development', AUTH_SECRET: '', PAYSTACK_SECRET_KEY: '  ' } as any);
    expect(dev.AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(dev.PAYSTACK_SECRET_KEY).toBeUndefined();

    expect(() =>
      loadEnv({ NODE_ENV: 'production', AUTH_SECRET: '', DATABASE_URL: 'postgresql://x', NEXT_PUBLIC_APP_URL: 'https://x.com' } as any)
    ).toThrow(/AUTH_SECRET/);
  });
});
