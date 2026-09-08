import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  BarChart3,
  ExternalLink,
  ShieldAlert,
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
        <div className="max-w-md mx-auto rounded-xl border border-red-900/40 bg-red-950/20 p-8 text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-xs text-slate-400">
            Your account ({session.email}) has role <strong className="text-white">{session.role}</strong> and lacks administrative privileges.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700"
          >
            Return to Storefront
          </Link>
        </div>
      </Container>
    );
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Products', href: '/admin/products', icon: Package },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
    { label: 'Customers', href: '/admin/customers', icon: Users },
    { label: 'Coupons', href: '/admin/coupons', icon: Tag },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Admin Top Navigation Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/80 sticky top-0 z-40 backdrop-blur-md">
        <Container>
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <span className="rounded bg-blue-600 px-2 py-0.5 text-xs">ADMIN</span>
                <span>NOV Console</span>
              </div>

              <nav className="hidden md:flex items-center gap-1 text-xs">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-400 hidden sm:inline">{session.email}</span>
              <Link
                href="/"
                target="_blank"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
              >
                <span>View Store</span>
                <ExternalLink className="w-3 h-3" />
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
