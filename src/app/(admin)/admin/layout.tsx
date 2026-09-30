import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { AdminTopBar, AdminBottomNav } from '@/components/admin/admin-nav';
import { ShieldAlert } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <AdminTopBar email={session.email} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:pb-12">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
