'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Download, FileText, Loader2, Mail, Truck, Clock } from 'lucide-react';
import { formatCurrency, formatFileSize } from '@/lib/utils';
import { productPath } from '@/lib/product-url';

interface OrderReceipt {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  guestEmail: string | null;
  guestName: string | null;
  shippingAddress: { street?: string; city?: string; state?: string; postalCode?: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    productKind: 'DIGITAL' | 'PHYSICAL';
    variantTitle: string | null;
    totalPrice: number;
    product: {
      id: string;
      title: string;
      slug: string;
      coverImage: string | null;
      files: Array<{ id: string; fileName: string; fileSize: number }>;
    };
  }>;
}

const POLL_INTERVAL_MS = 3000;
const POLL_LIMIT = 20;

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('order_id');

  const [order, setOrder] = React.useState<OrderReceipt | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'missing'>('loading');

  React.useEffect(() => {
    if (!orderId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('missing');
      return;
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const load = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        setOrder(data.order);
        setState('ready');
        // A webhook may confirm a moment after the redirect: keep checking briefly.
        if (data.order.status === 'PENDING' && attempts < POLL_LIMIT) {
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setState('missing');
      }
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (state === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
      </div>
    );
  }

  if (state === 'missing' || !order) {
    return (
      <div className="space-y-3 py-16 text-center">
        <p className="text-stone-200">We couldn’t find this order.</p>
        <p className="text-sm text-stone-400">If you paid, check your email for your receipt.</p>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';
  const digitalItems = order.items.filter((i) => i.productKind === 'DIGITAL');
  const physicalItems = order.items.filter((i) => i.productKind === 'PHYSICAL');
  const address = order.shippingAddress;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        {isPaid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-amber-300" />
        )}
        <h1 className="text-2xl font-bold text-white">
          {isPaid ? `Thank you${order.guestName ? `, ${order.guestName.split(' ')[0]}` : ''}!` : 'Confirming your payment…'}
        </h1>
        <p className="text-sm text-stone-400">
          Order <span className="tabular-nums text-stone-200">{order.orderNumber}</span>
        </p>
        {!isPaid && (
          <p className="text-sm text-stone-400">This usually takes a few seconds. Keep this page open.</p>
        )}
      </div>

      {isPaid && digitalItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">Your downloads</h2>
          {digitalItems.map((item) => (
            <div key={item.id} className="space-y-2 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
              <div className="font-medium text-white">{item.product.title}</div>
              {item.product.files.length === 0 ? (
                <p className="text-sm text-stone-400">The file is being prepared. We’ll email it to you.</p>
              ) : (
                item.product.files.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/orders/${order.id}/download/${file.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 hover:bg-amber-200"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{file.fileName}</span>
                      <span className="shrink-0 text-xs font-normal opacity-70">{formatFileSize(file.fileSize)}</span>
                    </span>
                    <Download className="h-5 w-5 shrink-0" />
                  </a>
                ))
              )}
            </div>
          ))}
        </section>
      )}

      {physicalItems.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-400">
            <Truck className="h-4 w-4" /> Delivery
          </h2>
          {physicalItems.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="text-white">
                {item.product.title}
                {item.variantTitle && <span className="text-stone-400"> · {item.variantTitle}</span>}
                <span className="text-stone-400"> × {item.quantity}</span>
              </span>
              <span className="tabular-nums text-stone-200">{formatCurrency(item.totalPrice, order.currency)}</span>
            </div>
          ))}
          {address && (
            <p className="border-t border-stone-800 pt-3 text-sm text-stone-300">
              {[address.street, address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
            </p>
          )}
          {isPaid && <p className="text-sm text-stone-400">We’ll call or WhatsApp you when it’s on the way.</p>}
        </section>
      )}

      <dl className="space-y-1.5 rounded-2xl border border-stone-800 p-4 text-sm">
        <div className="flex justify-between text-stone-400">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(order.subtotal, order.currency)}</dd>
        </div>
        {order.discountTotal > 0 && (
          <div className="flex justify-between text-emerald-300">
            <dt>Discount</dt>
            <dd className="tabular-nums">−{formatCurrency(order.discountTotal, order.currency)}</dd>
          </div>
        )}
        {order.shippingFee > 0 && (
          <div className="flex justify-between text-stone-400">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{formatCurrency(order.shippingFee, order.currency)}</dd>
          </div>
        )}
        <div className="flex justify-between pt-1 font-bold text-white">
          <dt>{isPaid ? 'Paid' : 'Total'}</dt>
          <dd className="tabular-nums">{formatCurrency(order.total, order.currency)}</dd>
        </div>
      </dl>

      {isPaid && order.guestEmail && (
        <p className="flex items-start gap-2 text-sm text-stone-400">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            A receipt{digitalItems.length > 0 ? ' with your download link' : ''} is on its way to{' '}
            <strong className="text-stone-200">{order.guestEmail}</strong>.
          </span>
        </p>
      )}

      {order.items[0] && (
        <Link href={productPath(order.items[0].product.slug)} className="block text-center text-sm text-stone-500 underline">
          Back to the product page
        </Link>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <React.Suspense
        fallback={
          <div className="flex justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-amber-300" />
          </div>
        }
      >
        <SuccessContent />
      </React.Suspense>
    </div>
  );
}
