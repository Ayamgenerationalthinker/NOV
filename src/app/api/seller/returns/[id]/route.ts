import { NextRequest, NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ShippingService } from '@/services/shipping/shipping.service';
import { ReturnStatus } from '@prisma/client';
import { z } from 'zod';

const updateReturnSchema = z.object({
  status: z.nativeEnum(ReturnStatus),
  sellerResponse: z.string().optional(),
  returnTrackingNumber: z.string().optional(),
  restockInventory: z.boolean().default(false),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateReturnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await ShippingService.processReturn({
      returnId: id,
      status: parsed.data.status,
      sellerResponse: parsed.data.sellerResponse,
      returnTrackingNumber: parsed.data.returnTrackingNumber,
      restockInventory: parsed.data.restockInventory,
    });

    return NextResponse.json({ success: true, returnRequest: updated });
  } catch (err: any) {
    console.error('Process return error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update return request' }, { status: 500 });
  }
}
