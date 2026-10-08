'use client';

import { usePathname } from 'next/navigation';

/**
 * Routes that render without the shop header and footer: product landing pages and checkout
 * (distraction-free for buyers) and the owner's admin / sign-in screens (they have their own).
 */
const FOCUSED_PREFIXES = ['/p', '/checkout', '/admin', '/login', '/forgot-password', '/reset-password'];

export function isFocusedRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return FOCUSED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface SiteChromeProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function SiteChrome({ header, footer, children }: SiteChromeProps) {
  const pathname = usePathname();
  const focused = isFocusedRoute(pathname);
  // The header floats over the page. The homepage hero runs underneath it; other pages start below it.
  const clearHeader = !focused && pathname !== '/';

  return (
    <>
      {!focused && header}
      <main className={clearHeader ? 'flex-1 flex flex-col pt-20' : 'flex-1 flex flex-col'}>{children}</main>
      {!focused && footer}
    </>
  );
}
