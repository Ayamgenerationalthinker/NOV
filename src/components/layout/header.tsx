import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { env } from '@/lib/env';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/70 bg-stone-950/90 backdrop-blur-md">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="font-serif text-lg font-semibold tracking-[0.3em] text-stone-100 hover:text-amber-200">
            {env.NEXT_PUBLIC_APP_NAME.toUpperCase()}
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/#shop" className="rounded-lg px-3 py-2 text-stone-300 hover:bg-stone-900 hover:text-white">
              Shop
            </Link>
            <a
              href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
              className="rounded-lg px-3 py-2 text-stone-300 hover:bg-stone-900 hover:text-white"
            >
              Contact
            </a>
          </nav>
        </div>
      </Container>
    </header>
  );
}
