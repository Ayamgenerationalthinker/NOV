import Link from 'next/link';
import { MobileMenu } from './mobile-menu';
import { BrandLogo } from './brand-logo';
import { env } from '@/lib/env';

const linkClass =
  'flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function Header() {
  const name = env.NEXT_PUBLIC_APP_NAME;

  const links = (
    <>
      <Link href="/products" className={linkClass}>Shop</Link>
      <Link href="/#goals" className={linkClass}>Browse by goal</Link>
      <Link href="/#how-it-works" className={linkClass}>How it works</Link>
      <Link href="/#faq" className={linkClass}>Help</Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-ink font-body text-white">
      <div className="mx-auto flex h-[70px] w-full max-w-[1440px] items-center justify-between gap-6 px-4 lg:px-16">
        <Link
          href="/"
          aria-label={`${name} home`}
          className="flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <BrandLogo priority className="h-9 sm:h-10" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="hidden min-h-11 items-center rounded-[10px] bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex"
          >
            Browse guides
          </Link>
          <MobileMenu>{links}</MobileMenu>
        </div>
      </div>
    </header>
  );
}
