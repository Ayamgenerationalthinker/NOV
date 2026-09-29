import { NextRequest, NextResponse } from 'next/server';
import { ShippingService } from '@/services/shipping/shipping.service';
import { z } from 'zod';

const shippingCalcSchema = z.object({
  countryCode: z.string().length(2),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().int().min(1),
      weightGrams: z.number().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = shippingCalcSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid shipping calculation parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await ShippingService.calculateShippingFee(parsed.data);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Shipping calculation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to calculate shipping' }, { status: 500 });
  }
}
