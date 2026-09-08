import { NextResponse } from 'next/server';
import { RBACService } from '@/services/auth/rbac.service';
import { ProductService } from '@/services/product/product.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await RBACService.requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    if (typeof body.isPublished !== 'boolean') {
      return NextResponse.json({ error: 'Field "isPublished" must be a boolean' }, { status: 400 });
    }

    const updated = await ProductService.togglePublish(id, body.isPublished, auth.session.userId);
    return NextResponse.json({
      product: updated,
      message: body.isPublished ? 'Product published' : 'Product unpublished',
    });
  } catch (error) {
    console.error('Admin toggle publish error:', error);
    return NextResponse.json({ error: 'Failed to update publication status' }, { status: 500 });
  }
}
