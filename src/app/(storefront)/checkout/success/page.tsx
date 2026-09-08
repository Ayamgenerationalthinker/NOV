'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  CheckCircle2,
  Download,
  ArrowRight,
  Package,
  Layers,
  Loader2,
} from 'lucide-react';

interface OrderReceipt {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  currency: string;
  guestEmail?: string;
  items: Array<{
    id: string;
    totalPrice: number;
    product: {
      id: string;
      title: string;
      slug: string;
      productType: string;
      files: Array<{ id: string; fileName: string; fileSize: number }>;
    };
  }>;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderNumberParam = searchParams.get('orderNumber');

  const [order, setOrder] = React.useState<OrderReceipt | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    fetch(`/api/orders/${orderId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.order) setOrder(data.order);
      })
      .catch((err) => console.error('Failed to load order receipt:', err))
      .finally(() => setIsLoading(false));
  }, [orderId]);

  return (
    <div className="mx-auto max-w-2xl text-center space-y-8">
      {/* Success Badge & Header */}
      <div className="space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-950/20">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div>
          <Badge variant="success" className="mb-2">
            Order Confirmed
          </Badge>
          <h1 className="text-3xl font-extrabold text-white">Thank You for Your Order!</h1>
          <p className="mt-2 text-xs text-slate-400">
            Order Reference:{' '}
            <span className="font-mono font-bold text-white">
              {order?.orderNumber || orderNumberParam || 'Processing...'}
            </span>
          </p>
        </div>
      </div>

      {/* Order Details Card */}
      <Card className="border-slate-800 bg-slate-900/70 text-left overflow-hidden shadow-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs font-semibold text-white">Digital Delivery Status</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Lifetime entitlements granted to your account.
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Instant Access
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-xs">Loading order items...</span>
            </div>
          ) : order?.items && order.items.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Purchased Digital Deliverables ({order.items.length})
              </p>

              <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
                {order.items.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {item.product.title}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {item.product.files.length}{' '}
                          {item.product.files.length === 1 ? 'file' : 'files'} included
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-white shrink-0">
                      {formatCurrency(item.totalPrice, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 text-xs">
                <span className="font-semibold text-slate-300">Total Paid</span>
                <span className="text-base font-bold text-white">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
            </div>
          ) : null}

          {/* Direct Library Actions */}
          <div className="pt-2 space-y-3">
            <Link href="/account" className="block">
              <Button size="lg" className="w-full gap-2 shadow-lg shadow-blue-500/20">
                <Download className="w-4 h-4" />
                Access My Digital Library & Downloads
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/products" className="block text-center">
              <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Continue Browsing Catalog
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="py-16 md:py-24">
      <Container>
        <React.Suspense
          fallback={
            <div className="mx-auto max-w-md h-64 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800" />
          }
        >
          <SuccessContent />
        </React.Suspense>
      </Container>
    </div>
  );
}
