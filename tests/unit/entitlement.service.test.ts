import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntitlementService } from '@/services/entitlement/entitlement.service';
import { DownloadService, DownloadError } from '@/services/download/download.service';
import { EntitlementStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    entitlement: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    productFile: {
      findUnique: vi.fn(),
    },
    download: {
      create: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fns) => Promise.all(fns)),
  },
}));

vi.mock('@/services/storage/storage.service', () => ({
  storageService: {
    getSignedDownloadUrl: vi.fn().mockResolvedValue('https://storage.nov.com/signed-url?token=xyz123'),
  },
}));

describe('EntitlementService & DownloadService Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EntitlementService.verifyCustomerAccess', () => {
    it('returns entitlement when user has ACTIVE entitlement', async () => {
      const mockEntitlement = {
        id: 'ent-123',
        customerId: 'user-1',
        productId: 'prod-1',
        status: EntitlementStatus.ACTIVE,
      };

      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue(mockEntitlement as any);

      const result = await EntitlementService.verifyCustomerAccess('user-1', 'prod-1');
      expect(result).toEqual(mockEntitlement);
      expect(prisma.entitlement.findUnique).toHaveBeenCalledWith({
        where: {
          customerId_productId: {
            customerId: 'user-1',
            productId: 'prod-1',
          },
        },
      });
    });

    it('returns null when entitlement status is REVOKED', async () => {
      const mockEntitlement = {
        id: 'ent-123',
        customerId: 'user-1',
        productId: 'prod-1',
        status: EntitlementStatus.REVOKED,
      };

      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue(mockEntitlement as any);

      const result = await EntitlementService.verifyCustomerAccess('user-1', 'prod-1');
      expect(result).toBeNull();
    });

    it('returns null when no entitlement record exists for customer', async () => {
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue(null);

      const result = await EntitlementService.verifyCustomerAccess('user-unauthorized', 'prod-1');
      expect(result).toBeNull();
    });
  });

  describe('DownloadService Security & Authorization Barrier', () => {
    const mockFile = {
      id: 'file-123',
      productId: 'prod-1',
      fileName: 'pro-masterclass.zip',
      fileKey: 'products/prod-1/uuid-pro-masterclass.zip',
      fileSize: BigInt(1048576),
      fileType: 'application/zip',
      versionNumber: '1.0.0',
      maxDownloads: null,
      product: { id: 'prod-1', title: 'Pro Masterclass' },
    };

    it('SUCCESS: grants signed temporary download URL when customer has ACTIVE entitlement', async () => {
      vi.mocked(prisma.productFile.findUnique).mockResolvedValue(mockFile as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue({
        id: 'ent-1',
        customerId: 'customer-authorized',
        productId: 'prod-1',
        status: EntitlementStatus.ACTIVE,
      } as any);

      const result = await DownloadService.processDownloadRequest({
        fileId: 'file-123',
        customerId: 'customer-authorized',
        clientIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.downloadUrl).toBe('https://storage.nov.com/signed-url?token=xyz123');
      expect(result.fileName).toBe('pro-masterclass.zip');
      expect(result.fileSize).toBe(1048576);

      // Verify download audit log was created
      expect(prisma.download.create).toHaveBeenCalledWith({
        data: {
          entitlementId: 'ent-1',
          productFileId: 'file-123',
          customerId: 'customer-authorized',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('SECURITY BARRIER: rejects unauthorized customer with 403 FORBIDDEN_NO_ENTITLEMENT', async () => {
      vi.mocked(prisma.productFile.findUnique).mockResolvedValue(mockFile as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue(null);

      await expect(
        DownloadService.processDownloadRequest({
          fileId: 'file-123',
          customerId: 'customer-unauthorized',
        })
      ).rejects.toThrow(DownloadError);

      try {
        await DownloadService.processDownloadRequest({
          fileId: 'file-123',
          customerId: 'customer-unauthorized',
        });
      } catch (err: any) {
        expect(err.code).toBe('FORBIDDEN_NO_ENTITLEMENT');
        expect(err.statusCode).toBe(403);
      }

      // Ensure no download was logged
      expect(prisma.download.create).not.toHaveBeenCalled();
    });

    it('SECURITY BARRIER: rejects customer with REVOKED entitlement with 403', async () => {
      vi.mocked(prisma.productFile.findUnique).mockResolvedValue(mockFile as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue({
        id: 'ent-revoked',
        customerId: 'customer-refunded',
        productId: 'prod-1',
        status: EntitlementStatus.REVOKED,
      } as any);

      try {
        await DownloadService.processDownloadRequest({
          fileId: 'file-123',
          customerId: 'customer-refunded',
        });
        expect.fail('Should have thrown DownloadError');
      } catch (err: any) {
        expect(err.code).toBe('FORBIDDEN_NO_ENTITLEMENT');
        expect(err.statusCode).toBe(403);
      }
    });

    it('SECURITY BARRIER: rejects when download limit is exceeded', async () => {
      const fileWithLimit = {
        ...mockFile,
        maxDownloads: 3,
      };

      vi.mocked(prisma.productFile.findUnique).mockResolvedValue(fileWithLimit as any);
      vi.mocked(prisma.entitlement.findUnique).mockResolvedValue({
        id: 'ent-active',
        customerId: 'customer-exceeded',
        productId: 'prod-1',
        status: EntitlementStatus.ACTIVE,
      } as any);
      vi.mocked(prisma.download.count).mockResolvedValue(3);

      try {
        await DownloadService.processDownloadRequest({
          fileId: 'file-123',
          customerId: 'customer-exceeded',
        });
        expect.fail('Should have thrown DownloadError');
      } catch (err: any) {
        expect(err.code).toBe('DOWNLOAD_LIMIT_EXCEEDED');
        expect(err.statusCode).toBe(403);
      }
    });

    it('ERROR: throws 404 FILE_NOT_FOUND when file does not exist', async () => {
      vi.mocked(prisma.productFile.findUnique).mockResolvedValue(null);

      try {
        await DownloadService.processDownloadRequest({
          fileId: 'non-existent-file',
          customerId: 'customer-1',
        });
        expect.fail('Should have thrown DownloadError');
      } catch (err: any) {
        expect(err.code).toBe('FILE_NOT_FOUND');
        expect(err.statusCode).toBe(404);
      }
    });
  });
});
