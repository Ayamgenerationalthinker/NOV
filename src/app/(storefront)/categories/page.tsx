import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryService } from '@/services/category/category.service';
import { Layers, ArrowRight, Folder } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Categories | NOV.com',
  description: 'Browse digital products by category on NOV.com.',
};

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await CategoryService.getAllCategories();

  return (
    <div className="py-12 md:py-16">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4" />
            Taxonomy
          </div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">Browse by Category</h1>
          <p className="mt-3 text-sm text-slate-400">
            Find the exact digital tools, guides, and courses curated for your goals.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/products?category=${cat.slug}`} className="group block">
              <Card className="h-full border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition-all group-hover:shadow-xl group-hover:shadow-blue-950/20">
                <CardContent className="p-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <Folder className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-400 transition-colors">
                      {cat.productCount} {cat.productCount === 1 ? 'Product' : 'Products'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 pt-2 group-hover:translate-x-1 transition-transform">
                    <span>Explore category</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
