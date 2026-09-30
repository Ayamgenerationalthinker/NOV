import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { StockMovementType } from '@prisma/client';
import { z } from 'zod';

const adjustSchema = z.object({
  variantId: z.string(),
  quantityChange: z.number().int(),
  movementType: z.nativeEnum(StockMovementType).default(StockMovementType.MANUAL_ADJUSTMENT),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = adjustSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid adjustment payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await InventoryService.adjustStock({
      variantId: parsed.data.variantId,
      quantityChange: parsed.data.quantityChange,
      movementType: parsed.data.movementType,
      note: parsed.data.note,
      performedBy: auth.session.userId,
    });

    return NextResponse.json({
      success: true,
      variant: {
        ...result.variant,
        price: Number(result.variant.price),
      },
      movement: result.movement,
    });
  } catch (err: any) {
    console.error('Stock adjustment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to adjust stock' }, { status: 500 });
  }
}
