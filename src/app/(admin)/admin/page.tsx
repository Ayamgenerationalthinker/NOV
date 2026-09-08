import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/prisma';
import { Package, ShoppingCart, Users, ArrowUpRight, Plus, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const [productCount, userCount, orderCount] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.count(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Administrator Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Store metrics, catalog management, and administrative quick actions.
          </p>
        </div>

        <Link href="/admin/products/new">
          <Button size="sm" className="gap-1.5 shadow-md shadow-blue-600/30">
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/60 p-6">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Catalog Products</p>
              <h3 className="text-2xl font-extrabold text-white mt-2">{productCount}</h3>
              <Link href="/admin/products" className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-3 font-medium">
                Manage products
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Package className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-6">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Customers</p>
              <h3 className="text-2xl font-extrabold text-white mt-2">{userCount}</h3>
              <span className="text-[11px] text-slate-500 mt-3 block">Registered accounts</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-6">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Orders</p>
              <h3 className="text-2xl font-extrabold text-white mt-2">{orderCount}</h3>
              <span className="text-[11px] text-slate-500 mt-3 block">Order lifecycle engine</span>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <Link
            href="/admin/products/new"
            className="flex items-center justify-between p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors"
          >
            <div>
              <p className="font-semibold text-white">Create Digital Product</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Author a new product with files and pricing</p>
            </div>
            <Plus className="w-4 h-4 text-blue-400 shrink-0" />
          </Link>

          <Link
            href="/admin/products"
            className="flex items-center justify-between p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors"
          >
            <div>
              <p className="font-semibold text-white">Inventory & Publishing</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Publish or unpublish active digital goods</p>
            </div>
            <Package className="w-4 h-4 text-blue-400 shrink-0" />
          </Link>

          <Link
            href="/products"
            target="_blank"
            className="flex items-center justify-between p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors"
          >
            <div>
              <p className="font-semibold text-white">Live Storefront Catalog</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Preview products as seen by customers</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-blue-400 shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
