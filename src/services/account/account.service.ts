import { prisma } from '@/lib/prisma';
import { PasswordService } from '@/services/auth/password.service';
import { EntitlementService } from '@/services/entitlement/entitlement.service';
import { OrderStatus } from '@prisma/client';

export class AccountService {
  /**
   * Get customer account summary stats and profile details
   */
  static async getAccountSummary(customerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error(`Customer ${customerId} not found.`);
    }

    const [entitlementsCount, ordersCount, downloadsCount] = await Promise.all([
      prisma.entitlement.count({
        where: { customerId, status: 'ACTIVE' },
      }),
      prisma.order.count({
        where: { customerId },
      }),
      prisma.download.count({
        where: { customerId },
      }),
    ]);

    return {
      user,
      stats: {
        totalProducts: entitlementsCount,
        totalOrders: ordersCount,
        totalDownloads: downloadsCount,
      },
    };
  }

  /**
   * Get all orders placed by customer with items and transactions
   */
  static async getCustomerOrders(customerId: string) {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                productType: true,
              },
            },
          },
        },
        transactions: {
          select: {
            id: true,
            provider: true,
            transactionRef: true,
            status: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: Number(order.subtotal),
      discountTotal: Number(order.discountTotal),
      taxTotal: Number(order.taxTotal),
      total: Number(order.total),
      currency: order.currency,
      paymentProvider: order.paymentProvider,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.product.title,
        productSlug: item.product.slug,
        productType: item.product.productType,
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        totalPrice: Number(item.totalPrice),
      })),
      transactions: order.transactions.map((tx) => ({
        id: tx.id,
        provider: tx.provider,
        transactionRef: tx.transactionRef,
        status: tx.status,
        amount: Number(tx.amount),
        currency: tx.currency,
        createdAt: tx.createdAt,
      })),
    }));
  }

  /**
   * Get customer download activity audit history
   */
  static async getCustomerDownloads(customerId: string, limit = 50) {
    const downloads = await prisma.download.findMany({
      where: { customerId },
      include: {
        productFile: {
          select: {
            id: true,
            fileName: true,
            versionNumber: true,
            fileSize: true,
            fileType: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { downloadedAt: 'desc' },
      take: limit,
    });

    return downloads.map((dl) => {
      // Partially mask IP address for user privacy (e.g. 192.168.1.1 -> 192.168.***.***)
      let maskedIp = dl.ipAddress;
      if (maskedIp && maskedIp.includes('.')) {
        const parts = maskedIp.split('.');
        if (parts.length === 4) {
          maskedIp = `${parts[0]}.${parts[1]}.***.***`;
        }
      }

      return {
        id: dl.id,
        fileId: dl.productFileId,
        fileName: dl.productFile.fileName,
        versionNumber: dl.productFile.versionNumber,
        fileSize: dl.productFile.fileSize.toString(),
        fileType: dl.productFile.fileType,
        productId: dl.productFile.product.id,
        productTitle: dl.productFile.product.title,
        productSlug: dl.productFile.product.slug,
        ipAddress: maskedIp,
        userAgent: dl.userAgent,
        downloadedAt: dl.downloadedAt,
      };
    });
  }

  /**
   * Scan and associate any past guest purchases matching user's email address
   */
  static async claimGuestOrders(customerId: string, customerEmail: string) {
    // Find unassociated orders matching email
    const guestOrders = await prisma.order.findMany({
      where: {
        guestEmail: { equals: customerEmail, mode: 'insensitive' },
        customerId: null,
      },
      include: {
        items: true,
      },
    });

    if (guestOrders.length === 0) {
      return { claimedCount: 0, message: 'No unlinked guest orders found.' };
    }

    let claimedCount = 0;

    for (const order of guestOrders) {
      // Link order to customer
      await prisma.order.update({
        where: { id: order.id },
        data: { customerId },
      });

      // If order is already PAID, grant digital entitlements
      if (order.status === OrderStatus.PAID) {
        for (const item of order.items) {
          await EntitlementService.grantEntitlement({
            customerId,
            productId: item.productId,
            orderId: order.id,
          });
        }
      }

      claimedCount++;
    }

    return {
      claimedCount,
      message: `Successfully claimed ${claimedCount} previous purchase${claimedCount > 1 ? 's' : ''}.`,
    };
  }

  /**
   * Update profile details (e.g. name)
   */
  static async updateProfile(customerId: string, { name }: { name?: string }) {
    const updated = await prisma.user.update({
      where: { id: customerId },
      data: {
        name: name?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return updated;
  }

  /**
   * Change customer password
   */
  static async changePassword(
    customerId: string,
    { currentPassword, newPassword }: { currentPassword: string; newPassword: string }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!user || !user.passwordHash) {
      throw new Error('User account not found or has no password set.');
    }

    const isValid = await PasswordService.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Incorrect current password.');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters.');
    }

    const newHash = await PasswordService.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: customerId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password updated successfully.' };
  }
}
