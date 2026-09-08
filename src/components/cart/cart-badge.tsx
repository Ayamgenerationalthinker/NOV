'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/cart-context';

export function CartBadge() {
  const { itemCount, isLoaded } = useCart();

  return (
    <Link
      href="/cart"
      className="relative p-2 text-slate-300 hover:text-white transition-colors"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingBag className="w-5 h-5" />
      {isLoaded && itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm shadow-blue-500/50 animate-in fade-in zoom-in duration-200">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
