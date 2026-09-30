import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { env } from '@/lib/env';

export function Footer() {
  const name = env.NEXT_PUBLIC_APP_NAME;
  return (
    <footer className="mt-16 border-t border-stone-800/70">
      <Container>
        <div className="flex flex-col gap-6 py-10 text-sm text-stone-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Link href="/" className="font-serif text-base font-semibold tracking-[0.3em] text-stone-100">
              {name.toUpperCase()}
            </Link>
            <p className="flex items-center gap-1.5 text-xs">
              <Lock className="h-3.5 w-3.5" /> Secure checkout with Mobile Money or card (GH₵)
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/#shop" className="hover:text-white">Shop</Link>
            <a href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`} className="hover:text-white">Contact</a>
          </nav>
        </div>
        <div className="flex items-center justify-between pb-8 text-xs text-stone-600">
          <p>© {new Date().getFullYear()} {name}</p>
          <Link href="/login" className="hover:text-stone-300">Owner login</Link>
        </div>
      </Container>
    </footer>
  );
}
