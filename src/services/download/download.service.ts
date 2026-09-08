import { prisma } from '@/lib/prisma';
import { EntitlementService } from '../entitlement/entitlement.service';
import { storageService } from '../storage/storage.service';

export interface ProcessDownloadParams {
  fileId: string;
  customerId: string;
  clientIp?: string;
  userAgent?: string;
}

export interface ProcessDownloadResult {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  expiresInSeconds: number;
}

export class DownloadError extends Error {
  constructor(
    public code: 'FILE_NOT_FOUND' | 'FORBIDDEN_NO_ENTITLEMENT' | 'DOWNLOAD_LIMIT_EXCEEDED',
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

export class DownloadService {
  /**
   * Process and authorize a digital product download request
   */
  static async processDownloadRequest({
    fileId,
    customerId,
    clientIp,
    userAgent,
  }: ProcessDownloadParams): Promise<ProcessDownloadResult> {
    // 1. Fetch the product file
    const file = await prisma.productFile.findUnique({
      where: { id: fileId },
      include: {
        product: true,
      },
    });

    if (!file) {
      throw new DownloadError('FILE_NOT_FOUND', 'The requested file could not be found.', 404);
    }

    // 2. Strict entitlement validation
    const entitlement = await EntitlementService.verifyCustomerAccess(customerId, file.productId);

    if (!entitlement) {
      throw new DownloadError(
        'FORBIDDEN_NO_ENTITLEMENT',
        'You do not have an active purchase entitlement for this digital product.',
        403
      );
    }

    // 3. Download limit check (if enforced)
    if (file.maxDownloads !== null && file.maxDownloads > 0) {
      const priorDownloadsCount = await prisma.download.count({
        where: {
          productFileId: file.id,
          customerId,
        },
      });

      if (priorDownloadsCount >= file.maxDownloads) {
        throw new DownloadError(
          'DOWNLOAD_LIMIT_EXCEEDED',
          `Maximum download limit of ${file.maxDownloads} reached for this asset.`,
          403
        );
      }
    }

    // 4. Log download audit record
    await prisma.download.create({
      data: {
        entitlementId: entitlement.id,
        productFileId: file.id,
        customerId,
        ipAddress: clientIp || null,
        userAgent: userAgent || null,
      },
    });

    // 5. Generate cryptographically signed temporary URL (15 min expiry)
    const expiresInSeconds = 900;
    const downloadUrl = await storageService.getSignedDownloadUrl({
      key: file.fileKey,
      expiresInSeconds,
      originalFileName: file.fileName,
    });

    return {
      downloadUrl,
      fileName: file.fileName,
      fileSize: Number(file.fileSize),
      fileType: file.fileType,
      expiresInSeconds,
    };
  }
}
