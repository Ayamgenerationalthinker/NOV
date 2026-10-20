import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { SOCIAL_LINKS } from '@/content/home';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { BrandLogo } from './brand-logo';

const linkClass = 'text-fg/75 transition-colors duration-300 hover:text-fg';
const columnTitle = 'text-xs font-semibold uppercase tracking-[0.2em] text-accent-200';

export function Footer() {
  const name = env.NEXT_PUBLIC_APP_NAME;
  const email = env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const mailto = `mailto:${email}`;
  const hasSocial = SOCIAL_LINKS.length > 0;

  return (
    <footer className="relative overflow-hidden bg-surface pt-16 font-display">
      <Container>
        <div className="glass rounded-[2rem] p-7 sm:p-10">
          <div
            className={cn(
              'grid gap-10 sm:grid-cols-2',
              hasSocial ? 'lg:grid-cols-[1.6fr_1fr_1fr_1.2fr_1fr]' : 'lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]',
            )}
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" aria-label={`${name} home`} className="inline-block rounded-lg">
                <BrandLogo className="h-11" />
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg/75">
                Ebooks and downloads with practical, step-by-step guidance for building skills and income. Plant the
                idea, grow the skill, and see what it brings.
              </p>
              <p className="mt-5 flex items-center gap-2 text-sm text-fg/85">
                <Lock className="h-4 w-4 shrink-0 text-accent" aria-hidden /> Secure checkout with Mobile Money or card
                (GH₵)
              </p>
            </div>

            <nav aria-label="Quick links" className="flex flex-col gap-3 text-sm">
              <p className={columnTitle}>Quick links</p>
              <Link href="/products" className={linkClass}>All products</Link>
              <Link href="/#how-it-works" className={linkClass}>How it works</Link>
              <Link href="/#faq" className={linkClass}>FAQ</Link>
            </nav>

            <nav aria-label="Company" className="flex flex-col gap-3 text-sm">
              <p className={columnTitle}>Company</p>
              <Link href="/#why" className={linkClass}>Why {name}</Link>
              <Link href="/#stories" className={linkClass}>Reader stories</Link>
              <Link href="/#faq" className={linkClass}>Refunds &amp; delivery</Link>
            </nav>

            <nav aria-label="Contact" className="flex flex-col gap-3 text-sm">
              <p className={columnTitle}>Contact</p>
              <a href={mailto} className={cn(linkClass, 'break-all')}>{email}</a>
              <a href={`${mailto}?subject=Order%20help`} className={linkClass}>Help with an order</a>
              <a href={`${mailto}?subject=Privacy%20or%20terms%20question`} className={linkClass}>
                Privacy &amp; terms questions
              </a>
            </nav>

            {hasSocial && (
              <nav aria-label="Social" className="flex flex-col gap-3 text-sm">
                <p className={columnTitle}>Social</p>
                {SOCIAL_LINKS.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-fg/10 pt-6 text-xs text-fg/70">
            {/* The sign-in page is reached only from here, and looks like plain copyright text. */}
            <Link href="/login" className="cursor-default">© {new Date().getFullYear()} {name}</Link>
            <p>All rights reserved.</p>
          </div>
        </div>
      </Container>

      <p
        aria-hidden
        className="wordmark-fade pointer-events-none -mb-[0.18em] mt-6 select-none whitespace-nowrap text-center text-[17.5vw] font-semibold leading-none tracking-[-0.04em]"
      >
        {name.toUpperCase()}
      </p>
    </footer>
  );
}
