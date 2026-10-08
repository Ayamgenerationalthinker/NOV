import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { MobileMenu } from './mobile-menu';
import { Container } from '@/components/ui/container';
import { env } from '@/lib/env';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';

const linkClass =
  'rounded-full px-3.5 py-2 text-sm text-cream/80 transition-colors duration-300 hover:bg-cream/10 hover:text-cream focus-visible:outline-2 focus-visible:outline-brass';

export async function Header() {
  const session = await SessionService.getCurrentSession();
  const isOwner = Boolean(session && RBACService.isAdmin(session.role));
  const name = env.NEXT_PUBLIC_APP_NAME;

  const links = (
    <>
      <Link href="/#shop" className={linkClass}>Shop</Link>
      <Link href="/#how-it-works" className={linkClass}>How it works</Link>
      <Link href="/#why" className={linkClass}>Why {name}</Link>
      <a href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`} className={linkClass}>Contact</a>
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 font-display sm:px-4">
      <Container className="glass rounded-full !px-3 sm:!px-4">
        <div className="flex h-14 items-center justify-between gap-2">
          <Link
            href="/"
            className="rounded-full px-2 text-sm font-semibold tracking-[0.22em] text-cream min-[400px]:text-base min-[400px]:tracking-[0.28em] transition-colors hover:text-brass-200 focus-visible:outline-2 focus-visible:outline-brass sm:text-lg"
          >
            {name.toUpperCase()}
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {links}
          </nav>

          <div className="flex items-center gap-1.5">
            {isOwner && (
              <Link
                href="/admin"
                className="flex h-10 items-center gap-1.5 rounded-full border border-cream/25 px-3.5 text-sm font-semibold text-cream hover:bg-cream/10"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden /> Admin
              </Link>
            )}
            <Link
              href="/#shop"
              className={`glow-brass h-10 items-center ${isOwner ? 'hidden sm:flex' : 'flex'} shrink-0 whitespace-nowrap rounded-full bg-brass px-3.5 text-sm font-semibold sm:px-4 text-forest transition-colors duration-300 hover:bg-brass-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream`}
            >
              Browse ebooks
            </Link>

            <MobileMenu>{links}</MobileMenu>
          </div>
        </div>
      </Container>
    </header>
  );
}
