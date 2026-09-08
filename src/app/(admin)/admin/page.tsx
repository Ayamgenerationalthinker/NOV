import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalyticsService } from '@/services/admin/analytics.service';
import { AnalyticsChart } from '@/components/admin/analytics-chart';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Download,
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
    currency: 'USD',
  };

  let timeSeries: any[] = [];
  let topProducts: any[] = [];
  let recentOrders: any[] = [];

  try {
    const [ov, ts, tp, ro] = await Promise.all([
      AnalyticsService.getOverviewMetrics(),
      AnalyticsService.getRevenueTimeSeries(30),
      AnalyticsService.getTopProducts(5),
      AnalyticsService.getRecentOrders(6),
    ]);
    overview = ov;
    timeSeries = ts;
    topProducts = tp;
    recentOrders = ro;
  } catch (err) {
    console.error('Error fetching admin overview data:', err);
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-2.5 h-2.5" />
            PAID
          </span>
        );
      case OrderStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <Clock className="w-2.5 h-2.5" />
            PENDING
          </span>
        );
      case OrderStatus.REFUNDED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-400 border border-purple-800/60">
            <RotateCcw className="w-2.5 h-2.5" />
            REFUNDED
          </span>
        );
      case OrderStatus.CANCELLED:
      case OrderStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/60">
            <XCircle className="w-2.5 h-2.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black text-white tracking-tight">Executive Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time sales velocity, financial metrics, and customer insights for <strong className="text-white">NOV.com</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/orders">
            <Button size="sm" variant="outline" className="border-slate-800 text-xs">
              Manage Orders
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button size="sm" className="gap-1.5 shadow-md shadow-blue-600/30 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Gross Revenue</p>
              <h3 className="text-2xl font-black text-white mt-1">
                ${overview.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-emerald-400 font-medium mt-2 flex items-center gap-1">
                <span>Net: ${overview.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                {overview.totalRefunds > 0 && (
                  <span className="text-purple-400 text-[10px]">(-${overview.totalRefunds})</span>
                )}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Orders</p>
              <h3 className="text-2xl font-black text-white mt-1">{overview.totalOrders}</h3>
              <p className="text-[11px] text-slate-400 mt-2">
                <span className="text-white font-semibold">{overview.paidOrders} paid</span> ({overview.conversionRate}% completion)
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Avg Order Value</p>
              <h3 className="text-2xl font-black text-white mt-1">
                ${overview.averageOrderValue.toFixed(2)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2">
                <span className="text-white font-semibold">{overview.activeEntitlements}</span> active licenses
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0 flex items-start justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Customers & Files</p>
              <h3 className="text-2xl font-black text-white mt-1">{overview.totalCustomers}</h3>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <Download className="w-3 h-3 text-blue-400" />
                <span className="text-white font-semibold">{overview.totalDownloads}</span> file downloads
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Sales Velocity Chart */}
      <AnalyticsChart initialData={timeSeries} currency={overview.currency} />

      {/* Two Column Grid: Recent Orders & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 Columns on large screens) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              Recent Orders Stream
            </h3>
            <Link
              href="/admin/orders"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              View all orders
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No orders recorded yet. Complete a checkout to stream transactions.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 rounded-lg px-2 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">
                        {order.orderNumber}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {order.customer?.name || order.guestName || 'Guest'}{' '}
                      <span className="text-slate-500">
                        ({order.customer?.email || order.guestEmail || 'no-email'})
                      </span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-white">
                      ${Number(order.total).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Top Products
            </h3>
            <Link
              href="/admin/products"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              Catalog
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No product sales yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div
                  key={p.productId}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 font-bold text-xs text-slate-300 shrink-0">
                    #{idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {p.title}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {p.unitsSold} {p.unitsSold === 1 ? 'sale' : 'sales'} • ${p.price.toFixed(2)} each
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400">
                      ${p.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
