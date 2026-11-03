'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Routes that render without the shop header and footer: product landing pages and checkout
 * bring their own, and the owner's admin / sign-in screens have theirs.
 */
const FOCUSED_PREFIXES = ['/p', '/checkout', '/admin', '/login', '/register', '/forgot-password', '/reset-password'];

/** Owner and sign-in screens, on the light owner theme. */
const OWNER_PREFIXES = ['/admin', '/account', '/login', '/register', '/forgot-password', '/reset-password'];

/** Customer pages on the light paper theme. */
const PAPER_PREFIXES = ['/products', '/p', '/checkout'];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isFocusedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return FOCUSED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isOwnerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return OWNER_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isPaperRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/' || PAPER_PREFIXES.some((prefix) => matches(pathname, prefix));
}

interface SiteChromeProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function SiteChrome({ header, footer, children }: SiteChromeProps) {
  const pathname = usePathname();
  const focused = isFocusedRoute(pathname);
  const paper = isPaperRoute(pathname);
  const owner = isOwnerRoute(pathname);
  // The older screens swap amber for the brand's electric blue (see .shop-palette in globals.css).
  return (
    <>
      {!focused && header}
      <main className={cn('flex-1 flex flex-col', paper ? 'paper' : owner ? 'owner-light' : 'shop-palette')}>{children}</main>
      {!focused && footer}
    </>
  );
}
