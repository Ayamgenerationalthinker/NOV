import { prisma } from '@/lib/prisma';
import { EntitlementStatus } from '@prisma/client';

export interface GrantEntitlementParams {
  customerId: string;
  productId: string;
  orderId: string;
}

export interface RevokeEntitlementParams {
  entitlementId: string;
  reason: string;
  adminUserId?: string;
}

export class EntitlementService {
  /**
   * Check if a customer has an active entitlement to a product
   */
  static async verifyCustomerAccess(customerId: string, productId: string) {
    try {
      const entitlement = await prisma.entitlement.findUnique({
        where: {
          customerId_productId: {
            customerId,
            productId,
          },
        },
      });

      if (!entitlement || entitlement.status !== EntitlementStatus.ACTIVE) {
        return null;
      }

      return entitlement;
    } catch (err) {
      console.error('Failed to verify customer entitlement access:', err);
      return null;
    }
  }

  /**
   * Grant or reactivate customer entitlement for a purchased product
   */
  static async grantEntitlement({ customerId, productId, orderId }: GrantEntitlementParams) {
    return prisma.entitlement.upsert({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
      update: {
        status: EntitlementStatus.ACTIVE,
        orderId,
        grantedAt: new Date(),
        revokedAt: null,
        revokeReason: null,
      },
      create: {
        customerId,
        productId,
        orderId,
        status: EntitlementStatus.ACTIVE,
      },
    });
  }

  /**
   * Revoke an entitlement (e.g. following refund, chargeback, or fraud)
   */
  static async revokeEntitlement({ entitlementId, reason, adminUserId }: RevokeEntitlementParams) {
    const [updated] = await prisma.$transaction([
      prisma.entitlement.update({
        where: { id: entitlementId },
        data: {
          status: EntitlementStatus.REVOKED,
          revokedAt: new Date(),
          revokeReason: reason,
        },
      }),
      ...(adminUserId
        ? [
            prisma.auditLog.create({
              data: {
                userId: adminUserId,
                action: 'REVOKE_ENTITLEMENT',
                entityType: 'Entitlement',
                entityId: entitlementId,
                newValue: { reason },
              },
            }),
          ]
        : []),
    ]);

    return updated;
  }

  /**
   * Get all active entitlements for a customer library
   */
  static async getCustomerLibrary(customerId: string) {
    try {
      const entitlements = await prisma.entitlement.findMany({
        where: {
          customerId,
          status: EntitlementStatus.ACTIVE,
        },
        include: {
          product: {
            include: {
              files: {
                orderBy: { isPrimary: 'desc' },
              },
            },
          },
          downloads: {
            select: { id: true, downloadedAt: true, productFileId: true },
          },
        },
        orderBy: { grantedAt: 'desc' },
      });

      return entitlements.map((e) => ({
        id: e.id,
        grantedAt: e.grantedAt,
        product: {
          id: e.product.id,
          title: e.product.title,
          slug: e.product.slug,
          coverImage: e.product.coverImage,
          productType: e.product.productType,
          files: e.product.files.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            fileSize: Number(f.fileSize),
            fileType: f.fileType,
            versionNumber: f.versionNumber,
            isPrimary: f.isPrimary,
            maxDownloads: f.maxDownloads,
            customerDownloadCount: e.downloads.filter((d) => d.productFileId === f.id).length,
          })),
        },
      }));
    } catch (err) {
      console.error('Failed to get customer library:', err);
      return [];
    }
  }
}
