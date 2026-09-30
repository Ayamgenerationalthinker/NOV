import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { env } from '@/lib/env';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';

export async function Header() {
  const session = await SessionService.getCurrentSession();
  const isOwner = Boolean(session && RBACService.isAdmin(session.role));

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800/70 bg-stone-950/90 backdrop-blur-md">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="font-serif text-lg font-semibold tracking-[0.3em] text-stone-100 hover:text-amber-200">
            {env.NEXT_PUBLIC_APP_NAME.toUpperCase()}
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/#shop" className="rounded-lg px-3 py-2 text-stone-300 hover:bg-stone-900 hover:text-white">
              Shop
            </Link>
            {isOwner ? (
              <Link
                href="/admin"
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-2 font-semibold text-stone-950 hover:bg-amber-200"
              >
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Link>
            ) : (
              <a
                href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
                className="rounded-lg px-3 py-2 text-stone-300 hover:bg-stone-900 hover:text-white"
              >
                Contact
              </a>
            )}
          </nav>
        </div>
      </Container>
    </header>
  );
}
