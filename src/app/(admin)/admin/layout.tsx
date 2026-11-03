import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar, AdminTopBar, AdminBottomNav } from '@/components/admin/admin-nav';
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
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6fd] px-4">
        <div className="max-w-md rounded-3xl border border-[#e1e7f4] bg-[#ffffff] p-8 text-center shadow-[0_30px_60px_-30px_rgba(0,22,80,0.35)]">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-[#b3261e]" aria-hidden />
          <h1 className="font-heading text-xl font-extrabold text-[#001650]">This account can’t open the dashboard</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#46557d]">
            You are signed in as {session.email}, which doesn’t have owner access.
          </p>
          <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#0b5cff] px-5 text-sm font-bold text-[#ffffff] hover:bg-[#0848e0]">
            Back to the shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-950 text-stone-100">
      <AdminSidebar email={session.email} />
      <div className="min-w-0 flex-1">
        <AdminTopBar email={session.email} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-10 lg:pt-10">{children}</main>
      </div>
      <AdminBottomNav />
    </div>
  );
}
