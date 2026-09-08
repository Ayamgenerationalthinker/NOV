import { AnalyticsService } from '@/services/admin/analytics.service';
import { AnalyticsChart } from '@/components/admin/analytics-chart';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  RotateCcw,
  CheckCircle2,
  Percent,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
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

  try {
    const [ov, ts, tp] = await Promise.all([
      AnalyticsService.getOverviewMetrics(),
      AnalyticsService.getRevenueTimeSeries(30),
      AnalyticsService.getTopProducts(10),
    ]);
    overview = ov;
    timeSeries = ts;
    topProducts = tp;
  } catch (err) {
    console.error('Error fetching admin analytics page data:', err);
  }

  const refundRate =
    overview.totalOrders > 0
      ? Math.round((overview.refundedOrders / overview.totalOrders) * 1000) / 10
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Financial & Sales Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          In-depth revenue performance, conversion health, refund telemetry, and catalog sales share.
        </p>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Net Revenue</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              ${overview.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              Gross: ${overview.grossRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Conversion Rate</span>
            <h3 className="text-2xl font-black text-white mt-1">
              {overview.conversionRate}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              {overview.paidOrders} completed of {overview.totalOrders} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Refund Rate</span>
            <h3 className="text-2xl font-black text-purple-400 mt-1">
              {refundRate}%
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              ${overview.totalRefunds.toFixed(2)} refunded across {overview.refundedOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <CardContent className="p-0">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Avg Order Value</span>
            <h3 className="text-2xl font-black text-blue-400 mt-1">
              ${overview.averageOrderValue.toFixed(2)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-2">
              Per paid digital transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Velocity Chart */}
      <AnalyticsChart initialData={timeSeries} currency={overview.currency} />

      {/* Catalog Sales Performance Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Digital Catalog Revenue Share
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked breakdown of sales and revenue contribution per product
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            Manage Catalog
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Product Title</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Units Sold</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No sales recorded in the catalog yet.
                  </td>
                </tr>
              ) : (
                topProducts.map((prod, idx) => {
                  const share =
                    overview.grossRevenue > 0
                      ? Math.round((prod.totalRevenue / overview.grossRevenue) * 1000) / 10
                      : 0;

                  return (
                    <tr key={prod.productId} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {prod.title}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        ${prod.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {prod.unitsSold}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        ${prod.totalRevenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, share)}%` }}
                              className="h-full bg-blue-500 rounded-full"
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 w-10 text-right">
                            {share}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
