import { redirect } from 'next/navigation';
import { SessionService } from '@/services/auth/session.service';
import { EntitlementService } from '@/services/entitlement/entitlement.service';
import { AccountService } from '@/services/account/account.service';
import { Container } from '@/components/ui/container';
import { AccountPortal } from '@/components/account/account-portal';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customer Dashboard & Digital Library | NOV.com',
  description: 'Manage your digital assets, download files, view order receipts, and manage account security.',
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await SessionService.getCurrentSession();

  if (!session || !session.userId) {
    redirect('/login?redirect=/account');
  }

  try {
    const [summary, library, orders, downloads] = await Promise.all([
      AccountService.getAccountSummary(session.userId),
      EntitlementService.getCustomerLibrary(session.userId),
      AccountService.getCustomerOrders(session.userId),
      AccountService.getCustomerDownloads(session.userId),
    ]);

    return (
      <div className="py-10 md:py-14">
        <Container>
          <AccountPortal
            initialSummary={summary}
            initialLibrary={library}
            initialOrders={orders}
            initialDownloads={downloads}
          />
        </Container>
      </div>
    );
  } catch (error) {
    console.error('Failed to load account portal data:', error);
    // Graceful fallback for offline / unseeded database scenarios
    const fallbackSummary = {
      user: {
        id: session.userId,
        email: session.email,
        name: null,
        role: session.role,
        createdAt: new Date(),
      },
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalDownloads: 0,
      },
    };

    return (
      <div className="py-10 md:py-14">
        <Container>
          <AccountPortal
            initialSummary={fallbackSummary}
            initialLibrary={[]}
            initialOrders={[]}
            initialDownloads={[]}
          />
        </Container>
      </div>
    );
  }
}
