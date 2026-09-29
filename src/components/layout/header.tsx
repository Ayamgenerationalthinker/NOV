import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { CartBadge } from '@/components/cart/cart-badge';
import { User, Compass, Sparkles, Store, Layers } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 shadow-lg shadow-emerald-500/20 font-black text-black text-xs tracking-wider transition-transform group-hover:scale-105">
                NOV
              </div>
              <span className="tracking-tight font-black text-xl">
                NOV<span className="text-emerald-400">.COMMERCE</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <Link href="/products" className="hover:text-white transition-colors flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                All Products
              </Link>
              <Link href="/products?kind=PHYSICAL" className="hover:text-white transition-colors">
                Physical Goods
              </Link>
              <Link href="/products?kind=DIGITAL" className="hover:text-white transition-colors">
                Digital Assets
              </Link>
              <Link href="/categories" className="hover:text-white transition-colors">
                Categories
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <CartBadge />

            <Link href="/admin">
              <Button variant="ghost" size="sm" className="hidden lg:inline-flex gap-1.5 text-xs text-zinc-400 hover:text-white">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                Merchant Console
              </Button>
            </Link>

            <Link href="/account">
              <Button variant="secondary" size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-xs font-medium">
                <User className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                Account
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
