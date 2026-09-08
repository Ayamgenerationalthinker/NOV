'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Eye, EyeOff, Loader2, Package, ExternalLink } from 'lucide-react';
import { ProductType } from '@prisma/client';

interface AdminProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  currency: string;
  isPublished: boolean;
  isFeatured: boolean;
  productType: ProductType;
  createdAt: string;
  categories: Array<{ category: { name: string } }>;
  _count?: { orderItems: number; entitlements: number };
}

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setProducts(data.products || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/products/${id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isPublished: !currentStatus } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, edit, publish, and manage your digital product portfolio.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button size="sm" className="gap-1.5 shadow-md shadow-blue-600/30">
            <Plus className="w-4 h-4" />
            New Product
          </Button>
        </Link>
      </div>

      <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-xs">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">No products created yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Start by creating your first digital product with pricing, files, and description.
              </p>
              <Link href="/admin/products/new" className="inline-block mt-4">
                <Button size="sm" className="gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Create First Product
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Price</th>
                    <th className="px-6 py-3 font-semibold">Categories</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{p.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono">/{p.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="text-[10px]">
                          {p.productType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {formatCurrency(p.price, p.currency)}
                        </div>
                        {p.discountPrice && (
                          <div className="text-[10px] text-emerald-400">
                            Sale: {formatCurrency(p.discountPrice, p.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {p.categories.map(({ category }) => (
                            <span
                              key={category.name}
                              className="text-[10px] rounded bg-slate-800 px-1.5 py-0.5 text-slate-400"
                            >
                              {category.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.isPublished ? (
                          <Badge variant="success" className="text-[10px]">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] text-slate-400">
                            Draft
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={togglingId === p.id}
                            onClick={() => handleTogglePublish(p.id, p.isPublished)}
                            className="text-xs h-8 px-2"
                            title={p.isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {togglingId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : p.isPublished ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </Button>

                          <Link href={`/admin/products/${p.id}/edit`}>
                            <Button variant="ghost" size="sm" className="text-xs h-8 px-2" title="Edit">
                              <Edit className="w-3.5 h-3.5 text-slate-300" />
                            </Button>
                          </Link>

                          {p.isPublished && (
                            <Link href={`/products/${p.slug}`} target="_blank">
                              <Button variant="ghost" size="sm" className="text-xs h-8 px-2" title="View Storefront">
                                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
