'use client';

import * as React from 'react';
import Link from 'next/link';
import { Minus, Plus, Tag, Lock } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { BuyState, MAX_QUANTITY_PER_ORDER, buildCheckoutUrl } from '@/lib/product-purchase';

interface ProductBuyActionsProps {
  slug: string;
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
 */
export function ProductBuyActions({ slug, currency, isPhysical, basePrice, baseAvailable, initial }: ProductBuyActionsProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(initial.selectedId);
  const [quantity, setQuantity] = React.useState(initial.quantity);

  const selectedOption = initial.options.find((o) => o.id === selectedId) ?? null;
  const price = selectedOption ? { price: selectedOption.price, compareAtPrice: selectedOption.compareAtPrice } : basePrice;
  const available = selectedOption ? selectedOption.available : baseAvailable;
  const maxQuantity = Math.min(MAX_QUANTITY_PER_ORDER, Math.max(1, available ?? 1));
  const soldOut = isPhysical && (available ?? 0) <= 0;
  const qty = Math.min(quantity, maxQuantity);

  const checkoutHref = buildCheckoutUrl({
    slug,
    variantId: isPhysical ? selectedId : null,
    quantity: isPhysical ? qty : 1,
    coupon: initial.coupon,
  });

  return (
    <div className="space-y-5">
      {initial.options.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-300">Choose an option</legend>
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
                    'min-h-11 min-w-14 rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                    isSelected ? 'border-amber-300 bg-amber-300 text-stone-950' : 'border-stone-700 bg-stone-900 text-stone-100 hover:border-stone-500',
                    isOut && !isSelected && 'text-stone-500 line-through'
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
          <div className="text-sm">
            {soldOut ? (
              <span className="font-semibold text-red-400">Sold out</span>
            ) : available !== null && available <= 5 ? (
              <span className="text-amber-300">Only {available} left</span>
            ) : (
              <span className="text-emerald-400">In stock</span>
            )}
          </div>
          {!soldOut && (
            <div className="flex items-center rounded-xl border border-stone-700 bg-stone-900" role="group" aria-label="Quantity">
              <button type="button" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQuantity(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center text-stone-200 disabled:opacity-30">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-mono text-sm text-white" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Increase quantity" disabled={qty >= maxQuantity} onClick={() => setQuantity(Math.min(maxQuantity, qty + 1))} className="flex h-11 w-11 items-center justify-center text-stone-200 disabled:opacity-30">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {initial.coupon && (
        <p className="flex items-center gap-2 text-xs text-emerald-300">
          <Tag className="h-3.5 w-3.5" /> Code <strong className="font-mono">{initial.coupon}</strong> will be applied at checkout
        </p>
      )}

      {/* Fixed to the bottom of the screen on phones, inline on larger screens */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="md:hidden">
            <div className="font-mono text-lg font-bold text-white">{formatCurrency(price.price * (isPhysical ? qty : 1), currency)}</div>
            {price.compareAtPrice !== null && (
              <div className="font-mono text-xs text-stone-500 line-through">{formatCurrency(price.compareAtPrice * (isPhysical ? qty : 1), currency)}</div>
            )}
          </div>
          {soldOut ? (
            <span className="flex h-12 flex-1 items-center justify-center rounded-xl bg-stone-800 text-base font-semibold text-stone-400">
              Sold out
            </span>
          ) : (
            <Link
              href={checkoutHref}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-amber-300 text-base font-bold text-stone-950 shadow-lg shadow-amber-900/20 transition-colors hover:bg-amber-200 active:bg-amber-400"
            >
              Buy now
            </Link>
          )}
        </div>
      </div>

      <p className="hidden items-center gap-1.5 text-xs text-stone-400 md:flex">
        <Lock className="h-3.5 w-3.5" /> Pay securely with Mobile Money or card. No account needed.
      </p>
    </div>
  );
}
