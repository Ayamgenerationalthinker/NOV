'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Loader2, BookOpen, Package, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { productPath, productUrl } from '@/lib/product-url';
import { ShareProductButtons } from '@/components/admin/share-product-buttons';

interface AdminProductRow {
  id: string;
  title: string;
  slug: string;
  productKind: 'DIGITAL' | 'PHYSICAL';
  coverImage: string | null;
  price: number;
  discountPrice: number | null;
  currency: string;
  isPublished: boolean;
  salesCount: number;
  stockAvailable: number | null;
  files: Array<{ id: string }>;
}

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<AdminProductRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/admin/products?limit=100')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load products');
        setProducts(data.products || []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const togglePublish = async (product: AdminProductRow) => {
    setBusyId(product.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !product.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update');
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isPublished: !p.isPublished } : p)));
    } catch (err) {
      setError(`${product.title}: ${(err as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Products</h1>
          <p className="text-sm text-stone-400">{products.length} product{products.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/admin/products/new">
          <Button variant="success">
            <Plus className="w-4 h-4" /> New product
          </Button>
        </Link>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">{error}</div>}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 p-10 text-center">
          <p className="text-stone-300">No products yet.</p>
          <Link href="/admin/products/new" className="mt-3 inline-block text-sm text-emerald-400 underline">
            Create your first product
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const hasSale = p.discountPrice !== null && p.discountPrice < p.price;
            const needsFile = p.productKind === 'DIGITAL' && p.files.length === 0;
            return (
              <li key={p.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-800">
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-stone-500">
                        {p.productKind === 'DIGITAL' ? <BookOpen className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-white">{p.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          p.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-stone-700/60 text-stone-300'
                        }`}
                      >
                        {p.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
                      <span className="text-stone-200">
                        {formatCurrency(hasSale ? p.discountPrice! : p.price, p.currency)}
                        {hasSale && <s className="ml-1 text-stone-500">{formatCurrency(p.price, p.currency)}</s>}
                      </span>
                      <span>{p.salesCount} sold</span>
                      {p.stockAvailable !== null && (
                        <span className={p.stockAvailable === 0 ? 'text-amber-400' : ''}>
                          {p.stockAvailable === 0 ? 'Sold out' : `${p.stockAvailable} in stock`}
                        </span>
                      )}
                      {needsFile && <span className="text-amber-400">No file uploaded</span>}
                    </div>
                    {p.isPublished ? (
                      <a href={productPath(p.slug)} target="_blank" rel="noreferrer" className="block truncate text-xs text-emerald-400 underline">
                        {productUrl(p.slug)}
                      </a>
                    ) : (
                      <span className="block truncate text-xs text-stone-500">Link goes live when published</span>
                    )}
                  </div>
                </div>

                {(() => {
                  const actions = (
                    <>
                      <Link href={`/admin/products/${p.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant={p.isPublished ? 'ghost' : 'success'}
                        size="sm"
                        isLoading={busyId === p.id}
                        onClick={() => togglePublish(p)}
                      >
                        {p.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                    </>
                  );
                  return p.isPublished ? (
                    <ShareProductButtons slug={p.slug} title={p.title} className="mt-3" extra={actions} />
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
