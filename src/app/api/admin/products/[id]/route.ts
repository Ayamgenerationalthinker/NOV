import { NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ProductService } from '@/services/product/product.service';
import { productUpdateSchema } from '@/lib/validators/product';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = productUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await ProductService.updateProduct(id, parsed.data, auth.session.userId);
    return NextResponse.json({ product: updated, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Admin product update error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    await ProductService.deleteProduct(id, auth.session.userId);
    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Admin product delete error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete product' },
      { status: 400 }
    );
  }
}
