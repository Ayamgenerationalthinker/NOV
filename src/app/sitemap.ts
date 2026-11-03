import type { MetadataRoute } from 'next';
import { ProductService } from '@/services/product/product.service';
import { productUrl, siteOrigin } from '@/lib/product-url';

export const dynamic = 'force-dynamic';

/** Home, the shop and every published guide. Drafts never appear. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const pages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/products`, changeFrequency: 'weekly', priority: 0.9 },
  ];
  try {
    const { products } = await ProductService.getPublishedProducts({ page: 1, limit: 500, sort: 'newest' });
    for (const product of products) {
      pages.push({ url: productUrl(product.slug), lastModified: product.updatedAt, changeFrequency: 'monthly', priority: 0.8 });
    }
  } catch (error) {
    // The home and shop pages are still worth listing if the catalogue can't be read.
    console.error('Sitemap could not load products:', error);
  }
  return pages;
}
