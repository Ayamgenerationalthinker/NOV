'use client';

import { usePathname } from 'next/navigation';

/** Routes that render without the shop header, footer and banner (focused product pages). */
export function isFocusedRoute(pathname: string | null): boolean {
  return Boolean(pathname && (pathname === '/p' || pathname.startsWith('/p/')));
}

interface SiteChromeProps {
  banner: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function SiteChrome({ banner, header, footer, children }: SiteChromeProps) {
  const focused = isFocusedRoute(usePathname());

  return (
    <>
      {!focused && banner}
      {!focused && header}
      <main className="flex-1 flex flex-col">{children}</main>
      {!focused && footer}
    </>
  );
}
