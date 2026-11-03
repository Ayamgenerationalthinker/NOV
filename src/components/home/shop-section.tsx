'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, Search } from 'lucide-react';
import { GuideCard } from '@/components/products/guide-card';
import { GOALS } from '@/content/home';
import type { ShopProduct } from '@/lib/shop-product';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/track';
import { pageWidth, primaryButton, secondaryButton } from './primitives';

interface ShopSectionProps {
  products: ShopProduct[];
  isOwner?: boolean;
  /** Goal chosen by the link that opened the page. */
  initialGoal?: string | null;
  initialQuery?: string;
  /** Show only this many until a filter is used, with a link to the full shop. */
  limit?: number;
  /** The shop page's main heading; the homepage uses a section heading. */
  pageHeading?: boolean;
}

export function ShopSection({ products, isOwner = false, initialGoal = null, initialQuery = '', limit, pageHeading = false }: ShopSectionProps) {
  const [goal, setGoal] = useState<string | null>(initialGoal);
  const [query, setQuery] = useState(initialQuery);
  const needle = query.trim().toLowerCase();
  const matches = products.filter(
    (product) =>
      (!goal || product.goals.includes(goal)) &&
      (!needle ||
        product.title.toLowerCase().includes(needle) ||
        product.outcome?.toLowerCase().includes(needle) ||
        product.audience?.toLowerCase().includes(needle)),
  );
  const filtered = Boolean(goal || needle);
  const visible = limit && !filtered ? matches.slice(0, limit) : matches;
  const hidden = limit && !filtered && products.length > limit;
  const clearFilters = () => {
    setGoal(null);
    setQuery('');
  };
  const chipClass = (on: boolean) =>
    cn(
      'min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors',
      on ? 'border-brand bg-brand text-white shadow-[0_8px_18px_-10px_rgba(11,92,255,0.8)]' : 'border-line bg-card text-ink hover:border-brand/50',
    );
  const Title = pageHeading ? 'h1' : 'h2';

  return (
    <section id="shop" aria-labelledby="shop-title" className={cn('bg-paper', pageHeading ? 'bg-gradient-to-b from-band to-paper to-[340px] pb-14 pt-10 lg:pb-20 lg:pt-16' : 'py-14 lg:py-20')}>
      <div className={pageWidth}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="max-w-2xl">
            <Title id="shop-title" className={cn('font-heading font-extrabold tracking-[-0.02em] text-ink', pageHeading ? 'text-[38px] leading-[1.12] lg:text-[52px] lg:leading-[1.08]' : 'text-[28px] leading-[1.18] lg:text-[38px] lg:leading-[1.12]')}>
              {pageHeading ? 'All guides' : 'Find your next guide'}
            </Title>
            <p className="mt-2 text-base leading-relaxed text-ink-soft">
              {pageHeading
                ? 'Practical PDF guides for money, business, skills and everyday life. Every price is in GH₵ and includes the full download.'
                : 'Every price is in GH₵ and includes the full download.'}
            </p>
          </div>
          {products.length > 3 && (
            <div className="relative w-full shrink-0 md:w-80">
              <label htmlFor="shop-search" className="sr-only">Search guides</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden />
              <input
                id="shop-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides"
                className="min-h-12 w-full rounded-full border border-line-strong bg-card pl-11 pr-4 text-base text-ink shadow-[0_1px_2px_rgba(0,22,80,0.05)] placeholder:text-ink-soft"
              />
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div role="group" aria-label="Filter by goal" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
              <button type="button" aria-pressed={!goal} onClick={() => setGoal(null)} className={chipClass(!goal)}>
                All guides
              </button>
              {GOALS.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  aria-pressed={goal === item.slug}
                  onClick={() => setGoal(goal === item.slug ? null : item.slug)}
                  className={chipClass(goal === item.slug)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <p aria-live="polite" className="hidden shrink-0 text-[13px] font-semibold tabular-nums text-ink-soft md:block">
              {matches.length} guide{matches.length === 1 ? '' : 's'}
            </p>
          </div>
        )}

        <div className="mt-6">
          {products.length === 0 ? (
            <ComingSoon isOwner={isOwner} />
          ) : visible.length === 0 ? (
            <div className="rounded-3xl border border-line bg-card px-6 py-12 text-center">
              <h3 className="text-lg font-bold text-ink">No guides match {needle ? `“${query.trim()}”` : 'this goal'} yet.</h3>
              <p className="mt-2 text-sm text-ink-soft">Try another goal above, or look through everything we have.</p>
              <button type="button" onClick={clearFilters} className={cn(primaryButton, 'mt-5')}>
                Show all guides
              </button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => (
                <li key={product.id}>
                  <GuideCard product={product} headingLevel={pageHeading ? 2 : 3} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {hidden && (
          <div className="mt-6 flex justify-center">
            <Link href="/products" className={secondaryButton}>
              See all {products.length} guides <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function ComingSoon({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-card px-6 py-12 text-center sm:px-10">
      <h3 className="text-xl font-bold text-ink">New guides are coming soon.</h3>
      <p className="mt-2 text-sm text-ink-soft">Leave your email and we will tell you when the first guides are ready.</p>
      <NotifyForm />
      {isOwner && (
        <p className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">
          You haven’t published any products yet.{' '}
          <Link href="/admin/products/new" className="font-semibold text-brand-hover underline underline-offset-4">
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
      trackEvent('newsletter');
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p role="status" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ok">
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
        className="min-h-12 flex-1 rounded-[10px] border border-line-strong bg-card px-4 text-base text-ink placeholder:text-ink-soft"
      />
      <button type="submit" disabled={state === 'sending'} className={primaryButton}>
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Email me when ready
      </button>
      {state === 'error' && (
        <p id="notify-error" role="alert" className="w-full text-sm text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
