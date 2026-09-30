'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { ProductForm, ProductFormProduct } from '@/components/admin/product-form';
import { productPath } from '@/lib/product-url';
import { ShareProductButtons } from '@/components/admin/share-product-buttons';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const saved = searchParams.get('saved');

  const [product, setProduct] = React.useState<ProductFormProduct | null>(null);
  const [formKey, setFormKey] = React.useState(0);
  const [isFetching, setIsFetching] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProduct(data?.product ?? null))
      .finally(() => setIsFetching(false));
  }, [id]);

  if (isFetching) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Product not found</h2>
        <Link href="/admin/products" className="inline-block px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" aria-label="Back to products" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{product.title}</h1>
          <p className="text-xs text-zinc-400">{product.isPublished ? 'Published' : 'Draft — not visible to the public'}</p>
        </div>
      </div>

      {saved === 'published' && product.isPublished ? (
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
            Published! Share your link:
          </div>
          <ShareProductButtons slug={product.slug} title={product.title} showUrl size="md" />
          <a href={productPath(product.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-200 underline">
            Open product page <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : saved ? (
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Saved.
        </div>
      ) : null}

      {product.isPublished && saved !== 'published' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
          <div className="text-xs font-semibold text-zinc-300">Product link</div>
          <ShareProductButtons slug={product.slug} title={product.title} showUrl />
        </div>
      )}

      <ProductForm
        key={formKey}
        initialProduct={product}
        onSaved={(updated, justPublished) => {
          setProduct(updated);
          setFormKey((k) => k + 1);
          router.replace(`/admin/products/${id}/edit?saved=${justPublished ? 'published' : 'draft'}`, { scroll: true });
        }}
      />
    </div>
  );
}
