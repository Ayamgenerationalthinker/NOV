import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountService } from '@/services/account/account.service';
import { PasswordService } from '@/services/auth/password.service';
import { EntitlementService } from '@/services/entitlement/entitlement.service';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    entitlement: {
      count: vi.fn(),
    },
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    download: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/services/auth/password.service', () => ({
  PasswordService: {
    verifyPassword: vi.fn(),
    hashPassword: vi.fn(),
  },
}));

vi.mock('@/services/entitlement/entitlement.service', () => ({
  EntitlementService: {
    grantEntitlement: vi.fn(),
  },
}));

describe('AccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccountSummary', () => {
    it('should return user info and calculated stats', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'cust-1',
        email: 'customer@nov.com',
        name: 'Alex Novak',
        role: 'CUSTOMER',
        createdAt: new Date('2026-01-01'),
      } as any);

      vi.mocked(prisma.entitlement.count).mockResolvedValue(3);
      vi.mocked(prisma.order.count).mockResolvedValue(2);
      vi.mocked(prisma.download.count).mockResolvedValue(7);

      const summary = await AccountService.getAccountSummary('cust-1');

      expect(summary.user.email).toBe('customer@nov.com');
      expect(summary.stats.totalProducts).toBe(3);
      expect(summary.stats.totalOrders).toBe(2);
      expect(summary.stats.totalDownloads).toBe(7);
    });

    it('should throw an error if customer does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(AccountService.getAccountSummary('non-existent')).rejects.toThrow(
        'Customer non-existent not found'
      );
    });
  });

  describe('getCustomerOrders', () => {
    it('should format order items and transactions correctly', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        {
          id: 'ord-1',
          orderNumber: 'NOV-123456-7890',
          status: OrderStatus.PAID,
          subtotal: 100 as any,
          discountTotal: 10 as any,
          taxTotal: 0 as any,
          total: 90 as any,
          currency: 'USD',
          paymentProvider: 'FLUTTERWAVE',
          paidAt: new Date(),
          createdAt: new Date(),
          items: [
            {
              id: 'item-1',
              productId: 'prod-1',
              unitPrice: 100 as any,
              discountAmount: 10 as any,
              totalPrice: 90 as any,
              product: {
                id: 'prod-1',
                title: 'Next.js SaaS Kit',
                slug: 'nextjs-saas-kit',
                productType: 'SOURCE_CODE',
              },
            },
          ],
          transactions: [
            {
              id: 'tx-1',
              provider: 'FLUTTERWAVE',
              transactionRef: 'FLW-123',
              status: 'SUCCESSFUL',
              amount: 90 as any,
              currency: 'USD',
              createdAt: new Date(),
            },
          ],
        } as any,
      ]);

      const orders = await AccountService.getCustomerOrders('cust-1');

      expect(orders.length).toBe(1);
      expect(orders[0].orderNumber).toBe('NOV-123456-7890');
      expect(orders[0].total).toBe(90);
      expect(orders[0].items[0].productTitle).toBe('Next.js SaaS Kit');
      expect(orders[0].transactions[0].provider).toBe('FLUTTERWAVE');
    });
  });

  describe('getCustomerDownloads', () => {
    it('should mask IP address for privacy', async () => {
      vi.mocked(prisma.download.findMany).mockResolvedValue([
        {
          id: 'dl-1',
          productFileId: 'file-1',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          downloadedAt: new Date(),
          productFile: {
            id: 'file-1',
            fileName: 'saas-starter.zip',
            versionNumber: '1.2.0',
            fileSize: BigInt(10485760),
            fileType: 'application/zip',
            product: {
              id: 'prod-1',
              title: 'Next.js SaaS Kit',
              slug: 'nextjs-saas-kit',
            },
          },
        } as any,
      ]);

      const downloads = await AccountService.getCustomerDownloads('cust-1');

      expect(downloads.length).toBe(1);
      expect(downloads[0].fileName).toBe('saas-starter.zip');
      expect(downloads[0].ipAddress).toBe('192.168.***.***');
    });
  });

  describe('claimGuestOrders', () => {
    it('should link unassociated guest orders and grant entitlements for paid orders', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        {
          id: 'guest-ord-1',
          guestEmail: 'alex@nov.com',
          customerId: null,
          status: OrderStatus.PAID,
          items: [{ productId: 'prod-10' }],
        } as any,
      ]);

      vi.mocked(prisma.order.update).mockResolvedValue({} as any);

      const result = await AccountService.claimGuestOrders('cust-1', 'alex@nov.com');

      expect(result.claimedCount).toBe(1);
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'guest-ord-1' },
        data: { customerId: 'cust-1' },
      });
      expect(EntitlementService.grantEntitlement).toHaveBeenCalledWith({
        customerId: 'cust-1',
        productId: 'prod-10',
        orderId: 'guest-ord-1',
      });
    });

    it('should return 0 when no guest orders are found', async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([]);

      const result = await AccountService.claimGuestOrders('cust-1', 'empty@nov.com');
      expect(result.claimedCount).toBe(0);
      expect(result.message).toContain('No unlinked guest orders found');
    });
  });

  describe('changePassword', () => {
    it('should reject if current password is wrong', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'cust-1',
        passwordHash: 'valid_hashed_pw',
      } as any);

      vi.mocked(PasswordService.verifyPassword).mockResolvedValue(false);

      await expect(
        AccountService.changePassword('cust-1', {
          currentPassword: 'wrong-current-password',
          newPassword: 'brand_new_valid_password_123',
        })
      ).rejects.toThrow('Incorrect current password');
    });

    it('should reject if new password is too short', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'cust-1',
        passwordHash: 'valid_hashed_pw',
      } as any);

      vi.mocked(PasswordService.verifyPassword).mockResolvedValue(true);

      await expect(
        AccountService.changePassword('cust-1', {
          currentPassword: 'correct-password',
          newPassword: 'short',
        })
      ).rejects.toThrow('New password must be at least 8 characters');
    });

    it('should successfully update password hash when valid', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'cust-1',
        passwordHash: 'valid_hashed_pw',
      } as any);

      vi.mocked(PasswordService.verifyPassword).mockResolvedValue(true);
      vi.mocked(PasswordService.hashPassword).mockResolvedValue('new_valid_hash');
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      const result = await AccountService.changePassword('cust-1', {
        currentPassword: 'correct-password',
        newPassword: 'brand_new_valid_password_123',
      });

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { passwordHash: 'new_valid_hash' },
      });
    });
  });
});
