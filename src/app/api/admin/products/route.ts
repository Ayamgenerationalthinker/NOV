import { NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ProductService, ProductValidationError } from '@/services/product/product.service';
import { productCreateSchema } from '@/lib/validators/product';

export async function GET(request: Request) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const result = await ProductService.getAllProductsAdmin(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin product fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const parsed = productCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const product = await ProductService.createProduct(parsed.data, auth.session.userId);
    return NextResponse.json({ product, message: 'Product created successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Admin product creation error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
