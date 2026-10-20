import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { MobileMenu } from './mobile-menu';
import { BrandLogo } from './brand-logo';
import { Container } from '@/components/ui/container';
import { env } from '@/lib/env';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';

const linkClass =
  'rounded-full px-3.5 py-2 text-sm text-fg/80 transition-colors duration-300 hover:bg-fg/10 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent';

export async function Header() {
  const session = await SessionService.getCurrentSession();
  const isOwner = Boolean(session && RBACService.isAdmin(session.role));
  const name = env.NEXT_PUBLIC_APP_NAME;

  const links = (
    <>
      <Link href="/products" className={linkClass}>All products</Link>
      <Link href="/#how-it-works" className={linkClass}>How it works</Link>
      <Link href="/#why" className={linkClass}>Why {name}</Link>
      <a href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`} className={linkClass}>Contact</a>
    </>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 font-display sm:px-4">
      <Container className="glass-nav rounded-full !px-3 sm:!px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          <Link
            href="/"
            aria-label={`${name} home`}
            className="shrink-0 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <BrandLogo priority className="h-8 min-[400px]:h-9 sm:h-11" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {links}
          </nav>

          <div className="flex items-center gap-1.5">
            {isOwner && (
              <Link
                href="/admin"
                className="flex h-10 items-center gap-1.5 rounded-full border border-fg/25 px-3.5 text-sm font-semibold text-fg hover:bg-fg/10"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sr-only sm:hidden">Dashboard</span>
              </Link>
            )}
            <Link
              href="/#shop"
              className="hidden h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-accent px-4 text-sm font-semibold text-surface transition-colors duration-300 hover:bg-accent-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg sm:flex"
            >
              Shop now
            </Link>

            <MobileMenu>{links}</MobileMenu>
          </div>
        </div>
      </Container>
    </header>
  );
}
