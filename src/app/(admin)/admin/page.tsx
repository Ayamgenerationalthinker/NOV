import { formatCurrency } from '@/lib/utils';
import { RBACService } from '@/services/auth/rbac.service';
import Link from 'next/link';
import { AnalyticsService, type CatalogPaymentCounts } from '@/services/admin/analytics.service';
import { AnalyticsChart } from '@/components/admin/analytics-chart';
import {
  DollarSign,
  ShoppingCart,
  Users,
  ArrowUpRight,
  Plus,
  Package,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  await RBACService.requireAdminPage('/admin');

  let overview = {
    grossRevenue: 0,
    netRevenue: 0,
    totalRefunds: 0,
    totalOrders: 0,
    paidOrders: 0,
    refundedOrders: 0,
    pendingOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    totalCustomers: 0,
    totalDownloads: 0,
    activeEntitlements: 0,
    currency: 'GHS',
  };

  let timeSeries: any[] = [];
  let topProducts: any[] = [];
  let recentOrders: any[] = [];
  let counts: CatalogPaymentCounts | null = null;
  let loadFailed = false;

  try {
    const [ov, ts, tp, ro, cc] = await Promise.all([
      AnalyticsService.getOverviewMetrics(),
      AnalyticsService.getRevenueTimeSeries(30),
      AnalyticsService.getTopProducts(5),
      AnalyticsService.getRecentOrders(6),
      AnalyticsService.getCatalogAndPaymentCounts(),
    ]);
    overview = ov;
    timeSeries = ts;
    topProducts = tp;
    recentOrders = ro;
    counts = cc;
  } catch (err) {
    loadFailed = true;
    console.error('Error fetching admin overview data:', err);
  }

  const STATUS: Partial<Record<OrderStatus, { label: string; className: string; icon: typeof CheckCircle2 }>> = {
    [OrderStatus.PAID]: { label: 'Paid', className: 'bg-[#e6f4ec] text-[#17693f]', icon: CheckCircle2 },
    [OrderStatus.PENDING]: { label: 'Pending', className: 'bg-[#fdf2df] text-[#7f4d00]', icon: Clock },
    [OrderStatus.REFUNDED]: { label: 'Refunded', className: 'bg-[#efe9fb] text-[#5b3aa8]', icon: RotateCcw },
    [OrderStatus.CANCELLED]: { label: 'Cancelled', className: 'bg-[#fcebea] text-[#b3261e]', icon: XCircle },
    [OrderStatus.FAILED]: { label: 'Failed', className: 'bg-[#fcebea] text-[#b3261e]', icon: XCircle },
  };

  const getStatusBadge = (status: OrderStatus) => {
    const s = STATUS[status];
    const Icon = s?.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${s?.className ?? 'bg-[#f3f6fd] text-[#46557d]'}`}>
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {s?.label ?? status}
      </span>
    );
  };

  const card = 'rounded-3xl border border-[#e1e7f4] bg-[#ffffff] shadow-[0_1px_2px_rgba(0,22,80,0.04)]';

  const kpis = [
    {
      label: 'Revenue',
      value: formatCurrency(overview.grossRevenue, overview.currency),
      note: `Net ${formatCurrency(overview.netRevenue, overview.currency)}${overview.totalRefunds > 0 ? `, ${formatCurrency(overview.totalRefunds, overview.currency)} refunded` : ''}`,
      icon: DollarSign,
      tint: 'bg-[#0b5cff] text-[#ffffff]',
    },
    {
      label: 'Orders',
      value: String(overview.totalOrders),
      note: `${overview.paidOrders} paid, ${overview.conversionRate}% completed`,
      icon: ShoppingCart,
      tint: 'bg-[#e7efff] text-[#0b5cff]',
    },
    {
      label: 'Average order',
      value: formatCurrency(overview.averageOrderValue, overview.currency),
      note: `${overview.activeEntitlements} active downloads`,
      icon: ShieldCheck,
      tint: 'bg-[#e7efff] text-[#0b5cff]',
    },
    {
      label: 'Customers',
      value: String(overview.totalCustomers),
      note: `${overview.totalDownloads} file downloads`,
      icon: Users,
      tint: 'bg-[#e7efff] text-[#0b5cff]',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0b5cff]">Overview</p>
          <h1 className="mt-1 font-heading text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-[#001650] lg:text-[36px]">Your shop at a glance</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/orders" className="inline-flex min-h-11 items-center rounded-full border border-[#c7d1e8] bg-[#ffffff] px-5 text-sm font-bold text-[#001650] hover:border-[#001650]">
            Manage orders
          </Link>
          <Link href="/admin/products/new" className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#0b5cff] px-5 text-sm font-bold text-[#ffffff] shadow-[0_12px_28px_-12px_rgba(11,92,255,0.75)] hover:bg-[#0848e0]">
            <Plus className="h-4 w-4" aria-hidden /> Add a guide
          </Link>
        </div>
      </div>

      {loadFailed && (
        <div role="alert" className="rounded-2xl border border-[#b3261e]/30 bg-[#fcebea] p-4 text-[15px] text-[#b3261e]">
          Some figures could not be loaded from the database. Refresh the page to try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, note, icon: Icon, tint }, i) => (
          <div key={label} className={i === 0 ? 'relative overflow-hidden rounded-3xl bg-[#001650] p-5 text-[#ffffff] shadow-[0_24px_48px_-28px_rgba(0,22,80,0.8)]' : `${card} p-5`}>
            {i === 0 && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_100%_0%,rgba(11,92,255,0.6),transparent_70%)]" />}
            <div className="relative flex items-start justify-between gap-3">
              <p className={`text-sm font-semibold ${i === 0 ? 'text-[#ffffff]/80' : 'text-[#46557d]'}`}>{label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            </div>
            <p className={`relative mt-3 font-heading text-[28px] font-extrabold tabular-nums leading-none ${i === 0 ? 'text-[#ffffff]' : 'text-[#001650]'}`}>{value}</p>
            <p className={`relative mt-2 text-sm ${i === 0 ? 'text-[#ffffff]/75' : 'text-[#56668f]'}`}>{note}</p>
          </div>
        ))}
      </div>

      {counts && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Guides', value: counts.totalProducts, href: '/admin/products', note: `${counts.publishedProducts} published`, icon: Package },
            {
              label: 'Drafts',
              value: counts.draftProducts,
              href: '/admin/products',
              note: counts.productsNeedingAttention > 0 ? `${counts.productsNeedingAttention} need a file or category` : 'Not visible to buyers',
              warn: counts.productsNeedingAttention > 0,
              icon: Package,
            },
            { label: 'Successful payments', value: counts.successfulPayments, href: '/admin/orders', note: 'Verified with Paystack', icon: CheckCircle2 },
            { label: 'Pending / failed', value: `${counts.pendingPayments} / ${counts.failedPayments}`, href: '/admin/orders', note: 'Payment attempts', icon: Clock },
          ].map((tile) => (
            <Link key={tile.label} href={tile.href} className={`${card} group p-4 transition-colors hover:border-[#0b5cff]/50`}>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#46557d]">
                <tile.icon className="h-4 w-4 text-[#0b5cff]" aria-hidden /> {tile.label}
              </p>
              <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-[#001650]">{tile.value}</p>
              <p className={`mt-1 text-sm ${tile.warn ? 'font-semibold text-[#7f4d00]' : 'text-[#56668f]'}`}>{tile.note}</p>
            </Link>
          ))}
        </div>
      )}

      <AnalyticsChart initialData={timeSeries} currency={overview.currency} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-labelledby="recent-title" className={`${card} p-5 sm:p-6 lg:col-span-2`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-title" className="font-heading text-lg font-bold text-[#001650]">Recent orders</h2>
            <Link href="/admin/orders" className="flex min-h-11 items-center gap-1 text-sm font-bold text-[#0848e0] hover:underline">
              View all <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="py-12 text-center text-[15px] text-[#56668f]">No orders yet. They appear here as soon as someone checks out.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#e1e7f4]">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7efff] text-sm font-bold text-[#0b5cff]">
                      {(order.customer?.name || order.guestName || 'G').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-[#001650]">{order.customer?.name || order.guestName || 'Guest'}</span>
                        {getStatusBadge(order.status)}
                      </p>
                      <p className="truncate text-sm text-[#56668f]">
                        <span className="tabular-nums">{order.orderNumber}</span> · {order.customer?.email || order.guestEmail || 'No email'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold tabular-nums text-[#001650]">{formatCurrency(Number(order.total), overview.currency)}</p>
                    <p className="text-sm text-[#56668f]">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="top-title" className={`${card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="top-title" className="flex items-center gap-2 font-heading text-lg font-bold text-[#001650]">
              <Sparkles className="h-5 w-5 text-[#0b5cff]" aria-hidden /> Best sellers
            </h2>
            <Link href="/admin/products" className="flex min-h-11 items-center gap-1 text-sm font-bold text-[#0848e0] hover:underline">
              All guides <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="py-12 text-center text-[15px] text-[#56668f]">No sales yet.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {topProducts.map((p, idx) => (
                <li key={p.productId} className="flex items-center gap-3 rounded-2xl bg-[#f3f6fd] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ffffff] text-sm font-bold tabular-nums text-[#001650]">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#001650]">{p.title}</p>
                    <p className="text-sm text-[#56668f]">
                      {p.unitsSold} {p.unitsSold === 1 ? 'sale' : 'sales'} · {formatCurrency(p.price, overview.currency)} each
                    </p>
                  </div>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-[#17693f]">{formatCurrency(p.totalRevenue, overview.currency)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
