import Link from 'next/link';
import { Metadata } from 'next';
import { Search } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { ProductCard } from '@/components/products/product-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ProductService } from '@/services/product/product.service';
import { DIGITAL_PRODUCT_TYPE_OPTIONS, isDigitalProductType } from '@/lib/product-types';
import { cn } from '@/lib/utils';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'All products',
  description: `Browse every ebook, course and video on ${env.NEXT_PUBLIC_APP_NAME}.`,
  alternates: { canonical: '/products' },
};

export const dynamic = 'force-dynamic';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
] as const;

type Sort = (typeof SORTS)[number]['value'];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const type = isDigitalProductType(params.type) ? params.type : undefined;
  const search = params.search?.trim().slice(0, 100) || undefined;
  const sort: Sort = SORTS.some((s) => s.value === params.sort) ? (params.sort as Sort) : 'newest';

  const { products } = await ProductService.getPublishedProducts({
    type,
    search,
    sort,
    page: 1,
    limit: 48,
  });

  const href = (next: { type?: string | null; sort?: string }) => {
    const query = new URLSearchParams();
    const nextType = next.type === undefined ? type : next.type;
    if (nextType) query.set('type', nextType);
    if (search) query.set('search', search);
    const nextSort = next.sort ?? sort;
    if (nextSort !== 'newest') query.set('sort', nextSort);
    const qs = query.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  const chip = (on: boolean) =>
    cn(
      'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      on ? 'border-accent bg-accent text-surface' : 'border-fg/20 bg-fg/5 text-fg/80 hover:bg-fg/10'
    );

  return (
    <div className="bg-surface py-10 text-fg md:py-14">
      <Container>
        <div className="flex flex-col gap-5 border-b border-fg/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {type ? `${DIGITAL_PRODUCT_TYPE_OPTIONS.find((o) => o.value === type)?.label}s` : 'All products'}
            </h1>
            <p className="mt-2 text-sm text-fg/70">
              {products.length} product{products.length === 1 ? '' : 's'}
              {search ? ` matching “${search}”` : ''}. Prices in GH₵, pay with Mobile Money or card.
            </p>
          </div>

          <form action="/products" method="GET" role="search" className="relative w-full md:w-80">
            {type && <input type="hidden" name="type" value={type} />}
            {sort !== 'newest' && <input type="hidden" name="sort" value={sort} />}
            <label htmlFor="catalog-search" className="sr-only">
              Search products
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg/50" aria-hidden />
            <input
              id="catalog-search"
              type="search"
              name="search"
              defaultValue={search || ''}
              placeholder="Search products"
              className="h-11 w-full rounded-full border border-fg/20 bg-surface-800/60 pl-11 pr-4 text-base text-fg placeholder:text-fg/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 sm:text-sm"
            />
          </form>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Filter by category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Link href={href({ type: null })} aria-current={!type ? 'page' : undefined} className={chip(!type)}>
              All
            </Link>
            {DIGITAL_PRODUCT_TYPE_OPTIONS.map((option) => (
              <Link
                key={option.value}
                href={href({ type: option.value })}
                aria-current={type === option.value ? 'page' : undefined}
                className={chip(type === option.value)}
              >
                {option.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Sort" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {SORTS.map((option) => (
              <Link
                key={option.value}
                href={href({ sort: option.value })}
                aria-current={sort === option.value ? 'true' : undefined}
                className={sort === option.value ? 'font-semibold text-accent-200' : 'text-fg/70 hover:text-fg'}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8">
          {products.length === 0 ? (
            <EmptyState
              title="No products found"
              message={type || search ? 'Try another category or search.' : 'New products are on the way.'}
              actionText={type || search ? 'Show all products' : 'Back to home'}
              actionHref={type || search ? '/products' : '/'}
            />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </div>
  );
}
