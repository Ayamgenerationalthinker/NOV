import Link from 'next/link';
import { Lock } from 'lucide-react';
import { SOCIAL_LINKS } from '@/content/home';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { BrandLogo } from './brand-logo';

const linkClass =
  'flex min-h-11 items-center text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const columnTitle = 'mb-1 text-xs font-bold uppercase tracking-[0.14em] text-white/70';

export function Footer() {
  const name = env.NEXT_PUBLIC_APP_NAME;
  const email = env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const mailto = `mailto:${email}`;
  const hasSocial = SOCIAL_LINKS.length > 0;

  return (
    <footer className="bg-ink-deep font-body text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-12 lg:px-16 lg:pt-14">
        <div className={cn('grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-10', hasSocial ? 'lg:grid-cols-[1.6fr_1fr_1fr_1.2fr_1fr]' : 'lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]')}>
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" aria-label={`${name} home`} className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <BrandLogo className="h-10" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">
              Practical PDF guides for money, business, skills and everyday life.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-white/80">
              <Lock className="h-4 w-4 shrink-0" aria-hidden /> Pay with Mobile Money or card in GH₵
            </p>
          </div>

          <nav aria-label="Shop" className="flex flex-col text-[15px]">
            <p className={columnTitle}>Shop</p>
            <Link href="/products" className={linkClass}>All guides</Link>
            <Link href="/#goals" className={linkClass}>Browse by goal</Link>
            <Link href="/#how-it-works" className={linkClass}>How it works</Link>
          </nav>

          <nav aria-label="Help" className="flex flex-col text-[15px]">
            <p className={columnTitle}>Help</p>
            <Link href="/#faq" className={linkClass}>Questions</Link>
            <Link href="/#faq" className={linkClass}>Refunds and delivery</Link>
            <Link href="/#stories" className={linkClass}>Reader stories</Link>
          </nav>

          <nav aria-label="Contact" className="col-span-2 flex flex-col text-[15px] sm:col-span-1">
            <p className={columnTitle}>Contact</p>
            <a href={mailto} className={cn(linkClass, 'break-all')}>{email}</a>
            <a href={`${mailto}?subject=Order%20help`} className={linkClass}>Help with an order</a>
            <a href={`${mailto}?subject=Privacy%20or%20terms%20question`} className={linkClass}>Privacy and terms questions</a>
          </nav>

          {hasSocial && (
            <nav aria-label="Social" className="flex flex-col text-[15px]">
              <p className={columnTitle}>Social</p>
              {SOCIAL_LINKS.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {link.label}
                </a>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-6 text-sm text-white/70">
          {/* The sign-in page is reached only from here, and looks like plain copyright text. */}
          <Link href="/login" className="cursor-default">© {new Date().getFullYear()} {name}</Link>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
