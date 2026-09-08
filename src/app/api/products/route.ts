import { NextResponse } from 'next/server';
import { ProductService } from '@/services/product/product.service';
import { productFilterSchema } from '@/lib/validators/product';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filterData = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      sort: searchParams.get('sort') || 'newest',
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 12,
    };

    const parsed = productFilterSchema.safeParse(filterData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await ProductService.getPublishedProducts(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
