import { Container } from '@/components/ui/container';
import { ProductCard } from '@/components/products/product-card';
import { ProductService } from '@/services/product/product.service';
import { CategoryService } from '@/services/category/category.service';
import { EmptyState } from '@/components/feedback/empty-state';
import Link from 'next/link';
import { Search, Compass } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Digital Products Catalog',
  description: 'Explore high-quality digital products, ebooks, templates, and courses on NOV.com.',
};

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; sort?: 'newest' | 'price-asc' | 'price-desc' | 'featured' }>;
}) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category;
  const currentSearch = resolvedParams.search;
  const currentSort = resolvedParams.sort || 'newest';

  const [{ products, pagination }, categories] = await Promise.all([
    ProductService.getPublishedProducts({
      category: currentCategory,
      search: currentSearch,
      sort: currentSort,
      page: 1,
      limit: 24,
    }),
    CategoryService.getAllCategories(),
  ]);

  return (
    <div className="py-12 md:py-16">
      <Container>
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4" />
              Storefront Catalog
            </div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Digital Products</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              Instant digital delivery with lifetime product updates and direct creator support.
            </p>
          </div>

          {/* Search Bar */}
          <form action="/products" method="GET" className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={currentSearch || ''}
              placeholder="Search products..."
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800/80 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
          </form>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-6 text-xs no-scrollbar">
          <Link
            href="/products"
            className={`px-3.5 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
              !currentCategory
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Products
          </Link>

          {categories.map((cat) => {
            const isActive = currentCategory === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className={`px-3.5 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-70">({cat.productCount})</span>
              </Link>
            );
          })}
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-12 text-center text-xs text-slate-500">
              Showing {products.length} of {pagination.total} products
            </div>
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              title="No products found"
              message={
                currentSearch || currentCategory
                  ? 'No digital products match your current search criteria. Try clearing filters.'
                  : 'Digital catalog items are currently being prepared. Check back shortly!'
              }
              actionText="View All Products"
              actionHref="/products"
            />
          </div>
        )}
      </Container>
    </div>
  );
}
