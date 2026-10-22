'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/track';

/** The owner console and sign-in screens are not part of the shop, so they are not counted. */
const UNTRACKED_PREFIXES = ['/admin', '/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Records a page view on every route change, and a "Clicked buy" whenever a visitor follows a
 * link to checkout. Other actions are recorded where they happen with trackEvent().
 */
export function VisitTracker() {
  const pathname = usePathname();
  // Effects can run twice for one navigation (React strict mode), so remember the last page counted.
  const lastTracked = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!pathname || UNTRACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    trackEvent('page_view');
  }, [pathname]);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== '/checkout') return;
      trackEvent('buy_click', url.searchParams.get('product') || 'cart');
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
