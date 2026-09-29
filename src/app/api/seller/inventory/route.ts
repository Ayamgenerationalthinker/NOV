import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await RBACService.requireSellerOrAdmin();
  if ('error' in auth) return auth.error;

  try {
    const store = await prisma.store.findUnique({ where: { sellerId: auth.session.userId } });
    const storeId = auth.session.role === 'ADMIN' || auth.session.role === 'SUPER_ADMIN' ? undefined : store?.id;

    const variants = await prisma.productVariant.findMany({
      where: storeId ? { product: { storeId } } : {},
      include: {
        product: {
          select: { id: true, title: true, slug: true, coverImage: true, productKind: true, storeId: true },
        },
      },
      orderBy: { inventoryQuantity: 'asc' },
    });

    const lowStockAlerts = await InventoryService.getLowStockAlerts(5, storeId);

    return NextResponse.json({
      inventory: variants.map((v) => ({
        ...v,
        price: Number(v.price),
        salePrice: v.salePrice ? Number(v.salePrice) : null,
      })),
      lowStockCount: lowStockAlerts.length,
    });
  } catch (err: any) {
    console.error('Inventory list error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch inventory' }, { status: 500 });
  }
}
