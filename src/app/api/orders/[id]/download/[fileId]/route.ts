import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { storageService } from '@/services/storage/storage.service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string; fileId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId, fileId } = await params;

    // 1. Fetch order and verify that it is fully paid
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                files: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== OrderStatus.PAID) {
      return NextResponse.json(
        { error: 'Payment required. Digital files are accessible only after successful payment verification.' },
        { status: 403 }
      );
    }

    // 2. Locate the requested file within the order's products
    let targetFile: { id: string; fileName: string; fileKey: string; fileSize: bigint; fileType: string; productId: string } | null = null;

    for (const item of order.items) {
      const match = item.product.files.find((f) => f.id === fileId);
      if (match) {
        targetFile = match;
        break;
      }
    }

    if (!targetFile) {
      return NextResponse.json(
        { error: 'The requested file does not belong to any product in this order.' },
        { status: 404 }
      );
    }

    // 3. Generate signed download URL (valid for 15 minutes)
    const downloadUrl = await storageService.getSignedDownloadUrl({
      key: targetFile.fileKey,
      originalFileName: targetFile.fileName,
      expiresInSeconds: 900,
    });

    // 4. Log download access record
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
      if (order.customerId) {
        const entitlement = await prisma.entitlement.findUnique({
          where: {
            customerId_productId: {
              customerId: order.customerId,
              productId: targetFile.productId,
            },
          },
        });

        if (entitlement) {
          await prisma.download.create({
            data: {
              entitlementId: entitlement.id,
              productFileId: targetFile.id,
              customerId: order.customerId,
              ipAddress: clientIp,
              userAgent: userAgent,
            },
          });
        }
      }
    } catch (logErr) {
      console.warn('Non-blocking download logging notice:', logErr);
    }

    // 5. If JSON requested return metadata, otherwise directly redirect to file stream
    const acceptHeader = request.headers.get('accept') || '';
    if (acceptHeader.includes('application/json')) {
      return NextResponse.json({
        success: true,
        downloadUrl,
        fileName: targetFile.fileName,
        fileSize: Number(targetFile.fileSize),
        mimeType: targetFile.fileType,
      });
    }

    return NextResponse.redirect(downloadUrl);
  } catch (error: any) {
    console.error('Order download route error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to prepare file download.' },
      { status: 500 }
    );
  }
}
