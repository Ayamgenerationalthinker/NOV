import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { CartBadge } from '@/components/cart/cart-badge';
import { User, Compass, ShoppingBag, Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-800/80 bg-stone-950/95 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-10">
            {/* Editorial Brand Mark */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif text-xl tracking-[0.25em] font-semibold text-stone-100 group-hover:text-amber-200 transition-colors">
                NOV
              </span>
              <span className="hidden sm:inline-block text-[9px] font-mono tracking-widest uppercase text-stone-500 border-l border-stone-800 pl-2">
                Atelier
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-medium tracking-wide text-stone-400">
              <Link href="/products" className="hover:text-stone-100 transition-colors">
                All Pieces
              </Link>
              <Link href="/products?kind=PHYSICAL" className="hover:text-stone-100 transition-colors">
                Physical Goods
              </Link>
              <Link href="/products?kind=DIGITAL" className="hover:text-stone-100 transition-colors">
                Digital Editions
              </Link>
              <Link href="/categories" className="hover:text-stone-100 transition-colors">
                Categories
              </Link>
            </nav>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <CartBadge />

            <Link
              href="/account"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-white hover:bg-stone-900 border border-transparent hover:border-stone-800 transition-all"
            >
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>Account</span>
            </Link>

            <Link
              href="/admin"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-300 hover:bg-stone-900/60 border border-stone-900 transition-all font-mono"
            >
              <Shield className="w-3 h-3 text-stone-500" />
              <span>Owner Studio</span>
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
