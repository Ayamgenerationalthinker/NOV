import { Container } from '@/components/ui/container';
import { ProductCard } from '@/components/products/product-card';
import { ProductService } from '@/services/product/product.service';
import { CategoryService } from '@/services/category/category.service';
import { EmptyState } from '@/components/feedback/empty-state';
import Link from 'next/link';
import { Search, Compass, Box, FileCode, Layers } from 'lucide-react';
import { Metadata } from 'next';
import { ProductKind } from '@prisma/client';

export const metadata: Metadata = {
  title: 'Catalog & Collections — Tomevari',
  description: 'Explore curated physical goods and digital assets on Tomevari.',
};

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    search?: string;
    kind?: ProductKind;
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'featured';
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category;
  const currentSearch = resolvedParams.search;
  const currentKind = resolvedParams.kind;
  const currentSort = resolvedParams.sort || 'newest';

  const [{ products, pagination }, categories] = await Promise.all([
    ProductService.getPublishedProducts({
      category: currentCategory,
      search: currentSearch,
      kind: currentKind,
      sort: currentSort,
      page: 1,
      limit: 30,
    }),
    CategoryService.getAllCategories(),
  ]);

  return (
    <div className="py-12 md:py-16 text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <Container>
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-900">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4" />
              Hybrid Storefront Catalog
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentKind === ProductKind.PHYSICAL
                ? 'Tangible Physical Goods'
                : currentKind === ProductKind.DIGITAL
                ? 'Digital Assets & Software'
                : 'All Collections'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-xl">
              Insured physical shipping with live tracking and zero-wait instant digital deliverables.
            </p>
          </div>

          {/* Search Bar */}
          <form action="/products" method="GET" className="relative w-full md:w-80">
            {currentKind && <input type="hidden" name="kind" value={currentKind} />}
            {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              name="search"
              defaultValue={currentSearch || ''}
              placeholder="Search products, brands, tags..."
              className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 shadow-inner"
            />
          </form>
        </div>

        {/* Kind Toggle Filters */}
        <div className="pt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/products${currentCategory ? `?category=${currentCategory}` : ''}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              !currentKind
                ? 'bg-white text-black shadow-lg'
                : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> All Types
          </Link>

          <Link
            href={`/products?kind=PHYSICAL${currentCategory ? `&category=${currentCategory}` : ''}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              currentKind === ProductKind.PHYSICAL
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" /> Physical Crafts
          </Link>

          <Link
            href={`/products?kind=DIGITAL${currentCategory ? `&category=${currentCategory}` : ''}`}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
              currentKind === ProductKind.DIGITAL
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-900/60 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" /> Digital Files
          </Link>
        </div>

        {/* Categories Pills */}
        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const isSelected = currentCategory === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}${currentKind ? `&kind=${currentKind}` : ''}`}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* Products Grid */}
        <div className="mt-10">
          {products.length === 0 ? (
            <EmptyState
              title="No Products Found"
              message="Try clearing your category or search filter to see more items."
              actionText="Reset Filters"
              actionHref="/products"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
