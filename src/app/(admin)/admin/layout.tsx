import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  RotateCcw,
  Settings,
  ShoppingCart,
  Users,
  Tag,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await SessionService.getCurrentSession();

  if (!session) {
    redirect('/login?redirect=/admin');
  }

  if (!RBACService.isAdmin(session.role)) {
    return (
      <Container className="py-24">
        <div className="max-w-md mx-auto rounded-3xl border border-red-900/40 bg-red-950/20 p-8 text-center shadow-2xl backdrop-blur-md">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Your account ({session.email}) has role <strong className="text-white font-mono">{session.role}</strong> and lacks merchant console authorization.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-5 py-2.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-zinc-200 transition-all shadow-lg"
          >
            Return to Storefront
          </Link>
        </div>
      </Container>
    );
  }

  const isFullAdmin = session.role === 'ADMIN' || session.role === 'SUPER_ADMIN';

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Products', href: '/admin/products', icon: Package },
    { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Fulfillment', href: '/admin/fulfillments', icon: Truck },
    { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
    { label: 'Store Settings', href: '/admin/settings', icon: Settings },
    ...(isFullAdmin
      ? [
          { label: 'Customers', href: '/admin/customers', icon: Users },
          { label: 'Coupons', href: '/admin/coupons', icon: Tag },
          { label: 'Marketing', href: '/admin/marketing', icon: Sparkles },
          { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation Console */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/90 sticky top-0 z-40 backdrop-blur-xl">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <span className="rounded-lg bg-emerald-500 text-black px-2 py-0.5 text-[11px] font-mono font-black tracking-wider">
                  {session.role}
                </span>
                <span className="tracking-tight text-base font-black">NOV CONSOLE</span>
              </div>

              <nav className="hidden xl:flex items-center gap-1 text-xs">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                    >
                      <Icon className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-zinc-500 hidden sm:inline font-mono">{session.email}</span>
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all font-medium"
              >
                <span>Live Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>
        </Container>
      </div>

      <div className="flex-1 py-8">
        <Container>{children}</Container>
      </div>
    </div>
  );
}
