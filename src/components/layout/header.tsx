import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { CartBadge } from '@/components/cart/cart-badge';
import { User, Compass } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-500/20 font-black text-white text-xs tracking-wider">
                NOV
              </div>
              <span className="tracking-tight">
                NOV<span className="text-blue-400">.com</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <Link href="/products" className="hover:text-white transition-colors flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-400" />
                Browse Catalog
              </Link>
              <Link href="/categories" className="hover:text-white transition-colors">
                Categories
              </Link>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <CartBadge />

            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex gap-1.5">
                <User className="w-4 h-4" />
                Sign In
              </Button>
            </Link>

            <Link href="/account">
              <Button variant="secondary" size="sm">
                My Library
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
