import { NextResponse } from 'next/server';
import { ProductService } from '@/services/product/product.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let product = await ProductService.getProductById(id);
    if (!product) {
      product = await ProductService.getProductBySlug(id);
    }

    if (!product || !product.isPublished) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product by id/slug:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
