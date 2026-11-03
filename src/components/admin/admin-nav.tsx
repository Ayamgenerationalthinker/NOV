'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MoreHorizontal,
  Tag,
  Users,
  BarChart3,
  Boxes,
  Truck,
  RotateCcw,
  Settings,
  ExternalLink,
  LogOut,
  X,
  MessageSquareQuote,
  Eye,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/layout/brand-logo';

const PRIMARY = [
  { label: 'Home', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
];

const SECONDARY = [
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Stories', href: '/admin/stories', icon: MessageSquareQuote },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Visitors', href: '/admin/visitors', icon: Eye },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Stock', href: '/admin/inventory', icon: Boxes },
  { label: 'Deliveries', href: '/admin/fulfillments', icon: Truck },
  { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

function useSignOut() {
  const router = useRouter();
  return async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/login');
    router.refresh();
  };
}

const sideLink = (on: boolean) =>
  cn(
    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
    on ? 'bg-[#0b5cff] text-[#ffffff] shadow-[0_10px_20px_-12px_rgba(11,92,255,0.9)]' : 'text-[#ffffff]/75 hover:bg-[#ffffff]/10 hover:text-[#ffffff]',
  );

/** Navy sidebar on large screens. Every colour is literal so the owner theme leaves it alone. */
export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname() || '/admin';
  const signOut = useSignOut();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#001650] px-4 py-5 text-[#ffffff] lg:flex">
      <Link href="/admin" aria-label="Tomevari dashboard" className="flex min-h-11 items-center rounded-lg px-2">
        <BrandLogo className="h-9" />
      </Link>

      <Link
        href="/admin/products/new"
        className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ffffff] px-4 text-sm font-bold text-[#001650] hover:bg-[#e7efff]"
      >
        <Plus className="h-4 w-4" aria-hidden /> Add a guide
      </Link>

      <nav aria-label="Dashboard" className="mt-6 flex-1 space-y-1 overflow-y-auto">
        {PRIMARY.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined} className={sideLink(isActive(pathname, href))}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </Link>
        ))}
        <p className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#ffffff]/45">More</p>
        {SECONDARY.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined} className={sideLink(isActive(pathname, href))}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 space-y-1 border-t border-[#ffffff]/10 pt-4">
        <p className="truncate px-3 pb-2 text-sm text-[#ffffff]/60" title={email}>{email}</p>
        <Link href="/" target="_blank" className={sideLink(false)}>
          <ExternalLink className="h-5 w-5" aria-hidden /> View shop
        </Link>
        <button type="button" onClick={signOut} className={cn(sideLink(false), 'w-full')}>
          <LogOut className="h-5 w-5" aria-hidden /> Sign out
        </button>
      </div>
    </aside>
  );
}

/** Top bar below the large breakpoint: logo, shop link, and tabs on tablets. */
export function AdminTopBar({ email }: { email: string }) {
  const pathname = usePathname() || '/admin';
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 bg-[#001650] text-[#ffffff] lg:hidden">
      <div className="flex h-16 items-center justify-between gap-3 px-4">
        <Link href="/admin" aria-label="Tomevari dashboard" className="flex min-h-11 shrink-0 items-center rounded-lg">
          <BrandLogo className="h-9" />
        </Link>
        <div className="flex items-center gap-1">
          <span className="sr-only">Signed in as {email}</span>
          <Link href="/" target="_blank" className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm text-[#ffffff]/85 hover:bg-[#ffffff]/10">
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">View shop</span>
          </Link>
          <button type="button" onClick={signOut} className="hidden min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-[#ffffff]/85 hover:bg-[#ffffff]/10 md:flex">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </div>
      </div>
      <nav aria-label="Dashboard" className="hidden gap-1 overflow-x-auto px-4 pb-3 md:flex">
        {[...PRIMARY, ...SECONDARY].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? 'page' : undefined}
            className={cn(
              'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium',
              isActive(pathname, href) ? 'bg-[#0b5cff] text-[#ffffff]' : 'text-[#ffffff]/75 hover:bg-[#ffffff]/10',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/** Bottom tab bar on phones: Home, Products, Orders, More. */
export function AdminBottomNav() {
  const pathname = usePathname() || '/admin';
  const [moreOpen, setMoreOpen] = React.useState(false);
  const signOut = useSignOut();
  const moreActive = SECONDARY.some((item) => isActive(pathname, item.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-label="More admin pages">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-[#001650]/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-[#ffffff] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-heading text-base font-bold text-[#001650]">More</p>
              <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#46557d]">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SECONDARY.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-sm font-medium',
                    isActive(pathname, href) ? 'border-[#0b5cff] bg-[#e7efff] text-[#001650]' : 'border-[#e1e7f4] text-[#46557d]',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={signOut}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#e1e7f4] px-2 py-3 text-sm font-medium text-[#46557d]"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e1e7f4] bg-[#ffffff]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {PRIMARY.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? 'page' : undefined}
              className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold', isActive(pathname, href) ? 'text-[#0b5cff]' : 'text-[#56668f]')}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-semibold', moreActive ? 'text-[#0b5cff]' : 'text-[#56668f]')}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
