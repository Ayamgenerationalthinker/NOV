'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Package, Search } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { GOALS } from '@/content/home';
import { productPath } from '@/lib/product-url';
import { DIGITAL_PRODUCT_TYPE_OPTIONS, type DigitalProductType } from '@/lib/product-types';
import { cn, formatCurrency } from '@/lib/utils';
import { useGoal } from './goal-context';
import { primaryButton, SectionHeading } from './primitives';
import { TiltCard } from './tilt-card';

/** What the grid needs to know about a product. Built on the server in app/page.tsx. */
export interface ShopProduct {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverImage: string | null;
  price: number;
  /** Set when the product is on sale; `price` is then the sale price. */
  wasPrice: number | null;
  currency: string;
  label: string;
  productType: string;
  isPhysical: boolean;
  soldOut: boolean;
  goals: string[];
}

interface ShopSectionProps {
  products: ShopProduct[];
  isOwner: boolean;
}

export function ShopSection({ products, isOwner }: ShopSectionProps) {
  const { selected, select } = useGoal();
  const [category, setCategory] = useState<DigitalProductType | null>(null);
  const [query, setQuery] = useState('');
  const goal = GOALS.find((g) => g.slug === selected);
  const needle = query.trim().toLowerCase();
  const visible = products.filter(
    (product) =>
      (!selected || product.goals.includes(selected)) &&
      (!category || product.productType === category) &&
      (!needle || product.title.toLowerCase().includes(needle) || product.summary?.toLowerCase().includes(needle))
  );
  // Only offer categories that have at least one product, so no filter leads to an empty grid.
  const categories = DIGITAL_PRODUCT_TYPE_OPTIONS.filter((option) =>
    products.some((product) => product.productType === option.value)
  );
  const filtered = Boolean(selected || category || needle);
  const clearFilters = () => {
    select(null);
    setCategory(null);
    setQuery('');
  };
  const chipClass = (on: boolean) =>
    cn(
      'h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      on ? 'border-accent bg-accent text-surface' : 'border-fg/20 bg-fg/5 text-fg/80 hover:bg-fg/10'
    );

  return (
    <section id="shop" aria-labelledby="shop-title" className="light relative bg-surface py-20 text-fg sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            id="shop-title"
            eyebrow="Shop"
            title={goal ? goal.name : 'Guides ready to download'}
            text="Every price is in GH₵. Pay with Mobile Money or card and start reading right away."
          />
          {products.length > 0 && (
            <p className="text-sm tabular-nums text-fg/70" aria-live="polite">
              {visible.length} of {products.length} product{products.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {products.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {categories.length > 1 ? (
              <div role="group" aria-label="Filter by category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                <button type="button" aria-pressed={!category} onClick={() => setCategory(null)} className={chipClass(!category)}>
                  All
                </button>
                {categories.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={category === option.value}
                    onClick={() => setCategory(category === option.value ? null : option.value)}
                    className={chipClass(category === option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            {products.length > 3 && (
              <div className="relative sm:w-72">
                <label htmlFor="shop-search" className="sr-only">
                  Search products
                </label>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg/50" aria-hidden />
                <input
                  id="shop-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products"
                  className="h-11 w-full rounded-full border border-fg/20 bg-surface/60 pl-11 pr-4 text-base text-fg placeholder:text-fg/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 sm:text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          {products.length === 0 ? (
            <ComingSoon isOwner={isOwner} />
          ) : visible.length === 0 ? (
            <div className="glass rounded-3xl px-6 py-14 text-center">
              <p className="text-lg font-semibold text-fg">No products match {needle ? `“${query.trim()}”` : 'these filters'} yet.</p>
              <p className="mt-2 text-sm text-fg/70">New products are added as they are finished.</p>
              {filtered && (
                <button type="button" onClick={clearFilters} className={cn(primaryButton, 'mt-6')}>
                  Show everything
                </button>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => (
                <li key={product.id} data-reveal>
                  <ShopCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}

function ShopCard({ product }: { product: ShopProduct }) {
  const Placeholder = product.isPhysical ? Package : BookOpen;
  // The goals this guide was written for, shown as chips under its title.
  const chips = GOALS.filter((goal) => product.goals.includes(goal.slug)).map((goal) => goal.name);

  return (
    <TiltCard className="h-full rounded-3xl">
      <Link
        href={productPath(product.slug)}
        className="glass group flex h-full flex-col overflow-hidden rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-800">
          {product.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.coverImage}
              alt={`Cover of ${product.title}`}
              loading="lazy"
              decoding="async"
              className={cn(
                'h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105',
                product.soldOut && 'opacity-50',
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-fg/30">
              <Placeholder className="h-12 w-12" aria-hidden />
            </div>
          )}
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
            <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-fg backdrop-blur">
              {product.label}
            </span>
            {product.soldOut ? (
              <span className="rounded-full bg-deep/90 px-2.5 py-1 text-[11px] font-semibold text-fg">Sold out</span>
            ) : (
              product.wasPrice !== null && (
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-surface">
                  −{Math.round((1 - product.price / product.wasPrice) * 100)}%
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-5">
          <h3 className="line-clamp-2 text-base font-semibold sm:text-lg leading-snug tracking-tight text-fg">{product.title}</h3>
          {product.summary && <p className="line-clamp-2 text-xs leading-relaxed text-fg/70 sm:text-sm">{product.summary}</p>}
          {chips.length > 0 && (
            <ul aria-label="Written for" className="flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <li key={chip} className="rounded-full border border-fg/15 bg-fg/5 px-2.5 py-1 text-[11px] font-medium text-fg/75">
                  {chip}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-col gap-2.5 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <p className="text-lg font-semibold leading-tight tabular-nums text-accent-200">
              {formatCurrency(product.price, product.currency)}
              {product.wasPrice !== null && (
                <s className="block text-sm font-normal text-fg/60">
                  {formatCurrency(product.wasPrice, product.currency)}
                </s>
              )}
            </p>
            <span className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-surface transition-colors duration-300 group-hover:bg-accent-200">
              {product.soldOut ? 'View' : 'Buy now'} <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}

function ComingSoon({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="glass mx-auto max-w-2xl rounded-3xl px-6 py-12 text-center sm:px-10">
      <p className="text-2xl font-semibold tracking-tight text-fg">New products are coming soon.</p>
      <p className="mt-2 text-sm text-fg/70">Leave your email and we will tell you when the first guides are ready.</p>
      <NotifyForm />
      {isOwner && (
        <p className="mt-8 border-t border-fg/10 pt-6 text-sm text-fg/70">
          You haven’t published any products yet.{' '}
          <Link href="/admin/products/new" className="font-semibold text-accent-200 underline underline-offset-4">
            Add your first product
          </Link>
        </p>
      )}
    </div>
  );
}

function NotifyForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/marketing/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p role="status" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent-200">
        <CheckCircle2 className="h-5 w-5" aria-hidden /> Thank you. We’ll email you when new guides are ready.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap">
      <label htmlFor="notify-email" className="sr-only">
        Email address
      </label>
      <input
        id="notify-email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-describedby={state === 'error' ? 'notify-error' : undefined}
        className="h-12 flex-1 rounded-full border border-fg/20 bg-surface/60 px-5 text-base text-fg placeholder:text-fg/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      <button type="submit" disabled={state === 'sending'} className={cn(primaryButton, 'disabled:opacity-70')}>
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Email me when ready
      </button>
      {state === 'error' && (
        <p id="notify-error" role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
