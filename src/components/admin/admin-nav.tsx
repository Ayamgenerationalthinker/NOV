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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIMARY = [
  { label: 'Home', href: '/admin', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
];

const SECONDARY = [
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Customers', href: '/admin/customers', icon: Users },
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

/** Top bar for all screens + horizontal section tabs from md up. */
export function AdminTopBar({ email }: { email: string }) {
  const pathname = usePathname() || '/admin';
  const signOut = useSignOut();

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/80 bg-stone-950/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-serif text-base font-semibold tracking-[0.3em] text-stone-100">TOMEVARI</span>
          <span className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-300">Admin</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="mr-2 hidden text-xs text-stone-500 lg:inline">{email}</span>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-stone-300 hover:bg-stone-900 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View shop</span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-stone-300 hover:bg-stone-900 hover:text-white md:flex"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
      <nav className="mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:flex">
        {[...PRIMARY, ...SECONDARY].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm',
              isActive(pathname, href) ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-900 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
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
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-stone-800 bg-stone-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-300">More</p>
              <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-stone-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SECONDARY.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs',
                    isActive(pathname, href) ? 'border-amber-300/50 bg-stone-900 text-white' : 'border-stone-800 text-stone-300'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={signOut}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-800 px-2 py-3 text-xs text-stone-300"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {PRIMARY.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                isActive(pathname, href) ? 'text-amber-300' : 'text-stone-400'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', moreActive ? 'text-amber-300' : 'text-stone-400')}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
