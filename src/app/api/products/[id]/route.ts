import { NextResponse } from 'next/server';
import { ProductService } from '@/services/product/product.service';
import { availableStock } from '@/lib/product-purchase';

export const dynamic = 'force-dynamic';

/** Public product lookup by id or slug. Only published products; only buyer-facing fields. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = (await ProductService.getProductBySlug(id)) ?? (await ProductService.getProductById(id));

    if (!product || !product.isPublished) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        shortDescription: product.shortDescription,
        productKind: product.productKind,
        productType: product.productType,
        coverImage: product.coverImage,
        galleryImages: product.galleryImages,
        price: product.price,
        discountPrice: product.discountPrice,
        currency: product.currency,
        isPublished: product.isPublished,
        variants: product.variants
          .filter((v) => v.isAvailable)
          .map((v) => ({
            id: v.id,
            sku: v.sku,
            title: v.title,
            option1Value: v.option1Value,
            option2Value: v.option2Value,
            price: v.price,
            salePrice: v.salePrice,
            inventoryQuantity: v.inventoryQuantity,
            reservedQuantity: v.reservedQuantity,
            isAvailable: v.isAvailable,
            available: availableStock(v),
          })),
        files: product.files.map((f) => ({ id: f.id, fileName: f.fileName, fileSize: f.fileSize })),
      },
    });
  } catch (error) {
    console.error('Error fetching product by id/slug:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
