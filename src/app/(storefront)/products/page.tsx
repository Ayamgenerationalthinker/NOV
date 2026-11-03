import { Metadata } from 'next';
import { ShopSection } from '@/components/home/shop-section';
import { ProductService } from '@/services/product/product.service';
import { isGoalSlug } from '@/lib/goals';
import { toShopProducts } from '@/lib/shop-product';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'All guides',
  description: `Browse every practical guide on ${env.NEXT_PUBLIC_APP_NAME}. Prices in GH₵, pay with Mobile Money or card.`,
  alternates: { canonical: '/products' },
};

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string; search?: string }>;
}) {
  const params = await searchParams;
  const goal = params.goal && isGoalSlug(params.goal) ? params.goal : null;
  const search = params.search?.trim().slice(0, 100) ?? '';

  const { products } = await ProductService.getPublishedProducts({ sort: 'newest', page: 1, limit: 48 });

  return <ShopSection pageHeading products={toShopProducts(products)} initialGoal={goal} initialQuery={search} />;
}
