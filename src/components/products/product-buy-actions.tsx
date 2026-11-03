'use client';

import * as React from 'react';
import Link from 'next/link';
import { Minus, Plus, Tag, Lock } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { BuyState, MAX_QUANTITY_PER_ORDER, buildCheckoutUrl } from '@/lib/product-purchase';
import { primaryButton } from '@/components/home/primitives';

interface ProductBuyActionsProps {
  slug: string;
  title: string;
  currency: string;
  isPhysical: boolean;
  /** Price shown when there are no options to choose. */
  basePrice: { price: number; compareAtPrice: number | null };
  /** Stock for products without options (null for digital). */
  baseAvailable: number | null;
  initial: BuyState;
}

/**
 * The single purchase control on the product landing page: option picker and quantity for
 * physical items (driven by real stock), and one "Buy now" button that goes straight to checkout.
 * On phones a bar with the same button slides in once the main one has scrolled away.
 */
export function ProductBuyActions({ slug, title, currency, isPhysical, basePrice, baseAvailable, initial }: ProductBuyActionsProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(initial.selectedId);
  const [quantity, setQuantity] = React.useState(initial.quantity);
  const [showBar, setShowBar] = React.useState(false);
  const mainButton = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = mainButton.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selectedOption = initial.options.find((o) => o.id === selectedId) ?? null;
  const price = selectedOption ? { price: selectedOption.price, compareAtPrice: selectedOption.compareAtPrice } : basePrice;
  const available = selectedOption ? selectedOption.available : baseAvailable;
  const maxQuantity = Math.min(MAX_QUANTITY_PER_ORDER, Math.max(1, available ?? 1));
  const soldOut = isPhysical && (available ?? 0) <= 0;
  const qty = Math.min(quantity, maxQuantity);
  const total = formatCurrency(price.price * (isPhysical ? qty : 1), currency);

  const checkoutHref = buildCheckoutUrl({
    slug,
    variantId: isPhysical ? selectedId : null,
    quantity: isPhysical ? qty : 1,
    coupon: initial.coupon,
  });

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-baseline gap-x-3 tabular-nums">
        <span className="text-[32px] font-bold leading-tight text-ink">{total}</span>
        {price.compareAtPrice !== null && (
          <s className="text-base text-ink-soft">{formatCurrency(price.compareAtPrice * (isPhysical ? qty : 1), currency)}</s>
        )}
      </p>

      {initial.options.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold text-ink">Choose an option</legend>
          <div className="flex flex-wrap gap-2">
            {initial.options.map((option) => {
              const isSelected = option.id === selectedId;
              const isOut = option.available <= 0;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedId(option.id);
                    setQuantity(1);
                  }}
                  className={cn(
                    'min-h-11 min-w-14 rounded-[10px] border px-4 py-2 text-sm font-semibold transition-colors',
                    isSelected ? 'border-ink bg-ink text-white' : 'border-line-strong bg-card text-ink hover:border-ink',
                    isOut && !isSelected && 'text-ink-soft line-through',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {isPhysical && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm font-semibold">
            {soldOut ? (
              <span className="text-bad">Sold out</span>
            ) : available !== null && available <= 5 ? (
              <span className="text-warn">Only {available} left</span>
            ) : (
              <span className="text-ok">In stock</span>
            )}
          </div>
          {!soldOut && (
            <div className="flex items-center rounded-[10px] border border-line-strong bg-card" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQuantity(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center text-ink disabled:opacity-30">
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span className="w-8 text-center text-sm tabular-nums text-ink" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={qty >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, qty + 1))} className="flex h-11 w-11 items-center justify-center text-ink disabled:opacity-30">
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}

      {initial.coupon && (
        <p className="flex items-center gap-2 text-sm text-ok">
          <Tag className="h-4 w-4" aria-hidden /> Code <strong className="tabular-nums">{initial.coupon}</strong> will be applied at checkout
        </p>
      )}

      <div ref={mainButton}>
        {soldOut ? (
          <span className="flex min-h-12 w-full items-center justify-center rounded-[10px] bg-band text-[15px] font-semibold text-ink-soft">Sold out</span>
        ) : (
          <Link href={checkoutHref} className={cn(primaryButton, 'w-full')}>
            <Lock className="h-4 w-4" aria-hidden /> Buy now
          </Link>
        )}
      </div>
      {!soldOut && <p className="text-sm text-ink-soft">Next, you enter your details and pay with Mobile Money or card. No account needed.</p>}

      {/* Phones only: repeats the title, price and button after the main one scrolls away. */}
      {!soldOut && (
        <div
          aria-hidden={!showBar}
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-200 md:hidden',
            showBar ? 'translate-y-0' : 'pointer-events-none translate-y-full',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{title}</p>
              <p className="text-base font-bold tabular-nums text-ink">{total}</p>
            </div>
            <Link href={checkoutHref} tabIndex={showBar ? undefined : -1} className={cn(primaryButton, 'shrink-0')}>
              Buy now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
