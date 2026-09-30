import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { SessionService, SESSION_COOKIE_NAME } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';

// Any database access before the auth check fails the test loudly.
vi.mock('@/lib/prisma', () => {
  const fail = () => {
    throw new Error('Database was touched before the admin check');
  };
  const model = new Proxy(fail, { get: () => fail, apply: fail });
  return { prisma: new Proxy({}, { get: () => model }) };
});

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

type RouteModule = Record<string, unknown>;
// Vite expands this glob at build time into lazy imports of every matching route file.
const routeModules = (import.meta as unknown as {
  glob: (patterns: string[]) => Record<string, () => Promise<RouteModule>>;
}).glob(['../../src/app/api/admin/**/route.ts', '../../src/app/api/seller/**/route.ts']);

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const customerSession = { userId: 'buyer-1', email: 'buyer@example.com', role: Role.CUSTOMER };
const sellerSession = { userId: 'seller-1', email: 'seller@example.com', role: Role.SELLER };

describe('Admin-only access', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('finds the admin and seller API routes', () => {
    expect(Object.keys(routeModules).length).toBeGreaterThanOrEqual(20);
  });

  for (const [file, load] of Object.entries(routeModules)) {
    const label = file.replace('../../src/app', '');

    it(`${label}: every handler rejects visitors, customers and sellers`, async () => {
      const mod = await load();
      const handlers = HTTP_METHODS.filter((m) => typeof mod[m] === 'function');
      expect(handlers.length).toBeGreaterThan(0);

      for (const session of [null, customerSession, sellerSession]) {
        vi.spyOn(SessionService, 'getCurrentSession').mockResolvedValue(session as any);

        for (const method of handlers) {
          const handler = mod[method] as (req: NextRequest, ctx: unknown) => Promise<Response>;
          const req = new NextRequest(`http://localhost:3000${label}`, {
            method,
            ...(method === 'GET' || method === 'DELETE' ? {} : { body: '{}' }),
          });
          const ctx = { params: Promise.resolve({ id: 'x', fileId: 'x' }) };

          const res = await handler(req, ctx);
          expect([401, 403], `${method} ${label} as ${session?.role ?? 'anonymous'}`).toContain(res.status);
        }
      }
    });
  }

  it('public registration is disabled', async () => {
    const { POST, GET } = await import('@/app/api/auth/register/route');
    expect((await POST()).status).toBe(403);
    expect((await GET()).status).toBe(403);
  });

  it('admin pages that read data on the server redirect non-admins to login', async () => {
    vi.spyOn(SessionService, 'getCurrentSession').mockResolvedValue(null);
    await expect(RBACService.requireAdminPage('/admin')).rejects.toThrow('NEXT_REDIRECT:/login?redirect=%2Fadmin');

    vi.spyOn(SessionService, 'getCurrentSession').mockResolvedValue(customerSession as any);
    await expect(RBACService.requireAdminPage('/admin')).rejects.toThrow('NEXT_REDIRECT');

    vi.spyOn(SessionService, 'getCurrentSession').mockResolvedValue({ ...customerSession, role: Role.SUPER_ADMIN } as any);
    await expect(RBACService.requireAdminPage('/admin')).resolves.toMatchObject({ role: Role.SUPER_ADMIN });
  });

  describe('proxy gate for /admin', () => {
    async function runProxy(cookie?: string) {
      const { proxy } = await import('@/proxy');
      const req = new NextRequest('http://localhost:3000/admin/products', {
        headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {},
      });
      return proxy(req);
    }

    it('redirects visitors without a session to login', async () => {
      const res = await runProxy();
      expect(res.headers.get('location')).toContain('/login?redirect=%2Fadmin%2Fproducts');
    });

    it('redirects a customer session and a forged token', async () => {
      const customerToken = await SessionService.createToken(customerSession);
      expect((await runProxy(customerToken)).headers.get('location')).toContain('/login');
      expect((await runProxy('eyJyb2xlIjoiU1VQRVJfQURNSU4ifQ.forged')).headers.get('location')).toContain('/login');
    });

    it('lets the owner through', async () => {
      const ownerToken = await SessionService.createToken({ userId: 'owner', email: 'o@example.com', role: Role.SUPER_ADMIN });
      const res = await runProxy(ownerToken);
      expect(res.headers.get('location')).toBeNull();
    });
  });
});

describe('Login redirect', () => {
  it('only follows same-site paths after sign-in', async () => {
    const { isSafeRedirect } = await import('@/lib/safe-redirect');
    expect(isSafeRedirect('/admin/products')).toBe(true);
    expect(isSafeRedirect('//evil.example')).toBe(false);
    expect(isSafeRedirect('/\\evil.example')).toBe(false);
    expect(isSafeRedirect('https://evil.example')).toBe(false);
    expect(isSafeRedirect('')).toBe(false);
  });
});
