import { prisma } from '@/lib/prisma';
import { storageService } from '../storage/storage.service';
import crypto from 'crypto';
import { isProductFileKey, safeFileName } from '@/lib/upload-rules';

export interface AttachFileParams {
  productId: string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  versionNumber?: string;
  isPrimary?: boolean;
  maxDownloads?: number;
  adminUserId: string;
}

export class ProductFileService {
  /**
   * Upload and attach a private digital asset file to a product
   */
  static async attachFileToProduct({
    productId,
    fileName,
    fileBuffer,
    mimeType,
    versionNumber = '1.0.0',
    isPrimary = true,
    maxDownloads,
    adminUserId,
  }: AttachFileParams) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found.');
    }

    const storageKey = `products/${productId}/${crypto.randomUUID()}-${safeFileName(fileName)}`;

    // Upload to private storage
    await storageService.uploadFile({
      fileBuffer,
      key: storageKey,
      contentType: mimeType,
    });

    return this.recordFile({
      productId,
      fileName,
      fileKey: storageKey,
      fileSize: fileBuffer.length,
      mimeType,
      versionNumber,
      isPrimary,
      maxDownloads,
      adminUserId,
    });
  }

  /**
   * Attach a file the owner's browser already uploaded straight to storage (large files).
   * The key must be under this product's folder and the file must really exist.
   */
  static async registerUploadedFile({
    productId,
    fileKey,
    fileName,
    adminUserId,
  }: {
    productId: string;
    fileKey: string;
    fileName: string;
    adminUserId: string;
  }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found.');

    if (!isProductFileKey(fileKey, productId)) {
      throw new Error('That file does not belong to this product.');
    }
    if (!storageService.statFile) {
      throw new Error('Direct uploads are not supported by the current storage.');
    }
    const info = await storageService.statFile(fileKey);
    if (!info) throw new Error('The uploaded file could not be found. Please upload it again.');

    return this.recordFile({
      productId,
      fileName,
      fileKey,
      fileSize: info.size,
      mimeType: info.contentType || 'application/octet-stream',
      isPrimary: true,
      adminUserId,
    });
  }

  private static async recordFile({
    productId,
    fileName,
    fileKey: storageKey,
    fileSize,
    mimeType,
    versionNumber = '1.0.0',
    isPrimary = true,
    maxDownloads,
    adminUserId,
  }: {
    productId: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    versionNumber?: string;
    isPrimary?: boolean;
    maxDownloads?: number;
    adminUserId: string;
  }) {
    // If marked primary, unset existing primary files
    if (isPrimary) {
      await prisma.productFile.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Insert database record
    const [file] = await prisma.$transaction([
      prisma.productFile.create({
        data: {
          productId,
          fileName,
          fileKey: storageKey,
          fileSize: BigInt(fileSize),
          fileType: mimeType,
          versionNumber,
          isPrimary,
          maxDownloads: maxDownloads ?? null,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ATTACH_PRODUCT_FILE',
          entityType: 'ProductFile',
          entityId: storageKey,
          newValue: {
            productId,
            fileName,
            fileSize,
            versionNumber,
          },
        },
      }),
    ]);

    return {
      ...file,
      fileSize: Number(file.fileSize),
    };
  }

  /**
   * Retrieve all files attached to a product with metrics
   */
  static async getProductFiles(productId: string) {
    const files = await prisma.productFile.findMany({
      where: { productId },
      include: {
        _count: {
          select: { downloads: true },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileKey: f.fileKey,
      fileSize: Number(f.fileSize),
      fileType: f.fileType,
      versionNumber: f.versionNumber,
      isPrimary: f.isPrimary,
      maxDownloads: f.maxDownloads,
      downloadCount: f._count.downloads,
      createdAt: f.createdAt,
    }));
  }

  /**
   * Delete a digital file from private storage and database
   */
  static async removeProductFile(fileId: string, adminUserId: string) {
    const file = await prisma.productFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found.');
    }

    // Remove from storage
    try {
      await storageService.deleteFile(file.fileKey);
    } catch (err) {
      console.error('Failed to delete file from storage:', err);
    }

    // Remove from database and audit log
    await prisma.$transaction([
      prisma.productFile.delete({
        where: { id: fileId },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'DELETE_PRODUCT_FILE',
          entityType: 'ProductFile',
          entityId: fileId,
          newValue: {
            productId: file.productId,
            fileName: file.fileName,
          },
        },
      }),
    ]);

    return { success: true };
  }

  /**
   * Create or update a product version release
   */
  static async createProductVersion(
    productId: string,
    versionNumber: string,
    changelog: string | undefined,
    adminUserId: string
  ) {
    const version = await prisma.productVersion.upsert({
      where: {
        productId_versionNumber: {
          productId,
          versionNumber,
        },
      },
      update: {
        changelog,
        releasedAt: new Date(),
      },
      create: {
        productId,
        versionNumber,
        changelog,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_PRODUCT_VERSION',
        entityType: 'ProductVersion',
        entityId: version.id,
        newValue: { productId, versionNumber },
      },
    });

    return version;
  }
}
