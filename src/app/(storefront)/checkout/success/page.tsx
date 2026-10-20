'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookOpen, CheckCircle2, Download, FileText, Loader2, Mail, PlayCircle, Truck, Clock } from 'lucide-react';
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
/** Every few polls, ask the server to re-verify with the payment provider (in case no webhook arrives). */
const RECHECK_EVERY = 4;

type ViewKind = 'pdf' | 'video' | null;

function viewKind(fileName: string): ViewKind {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['mp4', 'webm', 'm4v', 'mov'].includes(ext)) return 'video';
  return null;
}

/**
 * Opens a purchased PDF or video in a fixed-height viewer. The source is the order's download
 * route, which checks payment and returns a short-lived signed link, so nothing is public.
 */
function FileViewer({ src, kind, title, onClose }: { src: string; kind: Exclude<ViewKind, null>; title: string; onClose: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm text-stone-300">{title}</p>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-amber-300 underline">
            Full screen
          </a>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-white">
            Close
          </button>
        </div>
      </div>
      {kind === 'pdf' ? (
        <iframe
          src={src}
          title={title}
          className="h-[70vh] min-h-80 w-full rounded-xl border border-stone-800 bg-white"
        />
      ) : (
        <video src={src} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl border border-stone-800 bg-black" />
      )}
      {kind === 'pdf' && (
        <p className="text-xs text-stone-500">If the reader stays blank, use “Full screen” or download the file.</p>
      )}
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('order_id');

  const [order, setOrder] = React.useState<OrderReceipt | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'missing'>('loading');
  const [viewing, setViewing] = React.useState<string | null>(null);
  const [gaveUp, setGaveUp] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const checkNow = async () => {
    if (!orderId) return;
    setChecking(true);
    try {
      await fetch(`/api/orders/${orderId}/verify-payment`, { method: 'POST' });
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) setOrder((await res.json()).order);
    } finally {
      setChecking(false);
    }
  };

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
        if (attempts > 1 && attempts % RECHECK_EVERY === 0) {
          await fetch(`/api/orders/${orderId}/verify-payment`, { method: 'POST' }).catch(() => undefined);
        }
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        setOrder(data.order);
        setState('ready');
        // A webhook may confirm a moment after the redirect: keep checking briefly.
        if (data.order.status === 'PENDING') {
          if (attempts < POLL_LIMIT) timer = setTimeout(load, POLL_INTERVAL_MS);
          else setGaveUp(true);
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
        {!isPaid && !gaveUp && (
          <p className="text-sm text-stone-400">This usually takes a few seconds. Keep this page open.</p>
        )}
      </div>

      {!isPaid && gaveUp && (
        <div className="space-y-3 rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm">
          <p className="text-stone-200">
            Your payment hasn’t been confirmed yet. If you approved it, it can take a few minutes. Please don’t pay
            again. Your downloads unlock here as soon as the payment is confirmed.
          </p>
          <button
            type="button"
            onClick={checkNow}
            disabled={checking}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-700 font-semibold text-stone-100 disabled:opacity-60"
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />} Check again
          </button>
        </div>
      )}

      {isPaid && digitalItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">Your downloads</h2>
          {digitalItems.map((item) => (
            <div key={item.id} className="space-y-2 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
              <div className="font-medium text-white">{item.product.title}</div>
              {item.product.files.length === 0 ? (
                <p className="text-sm text-stone-400">The file is being prepared. We’ll email it to you.</p>
              ) : (
                item.product.files.map((file) => {
                  const downloadHref = `/api/orders/${order.id}/download/${file.id}`;
                  const kind = viewKind(file.fileName);
                  return (
                    <div key={file.id} className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <a
                          href={downloadHref}
                          className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl bg-amber-300 px-4 py-3 font-semibold text-stone-950 hover:bg-amber-200"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="truncate">{file.fileName}</span>
                            <span className="shrink-0 text-xs font-normal opacity-70">{formatFileSize(file.fileSize)}</span>
                          </span>
                          <Download className="h-5 w-5 shrink-0" aria-label="Download" />
                        </a>
                        {kind && (
                          <button
                            type="button"
                            aria-expanded={viewing === file.id}
                            onClick={() => {
                              // Phones without a built-in PDF viewer (e.g. Android Chrome) would show an
                              // empty frame: open the file in its own tab instead.
                              if (kind === 'pdf' && navigator.pdfViewerEnabled === false) {
                                window.open(`${downloadHref}?view=1`, '_blank', 'noopener');
                                return;
                              }
                              setViewing(viewing === file.id ? null : file.id);
                            }}
                            className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-700 px-4 font-semibold text-stone-100 hover:bg-stone-900"
                          >
                            {kind === 'pdf' ? <BookOpen className="h-4 w-4" aria-hidden /> : <PlayCircle className="h-4 w-4" aria-hidden />}
                            {kind === 'pdf' ? 'Read online' : 'Watch'}
                          </button>
                        )}
                      </div>
                      {kind && viewing === file.id && (
                        <FileViewer src={`${downloadHref}?view=1`} kind={kind} title={file.fileName} onClose={() => setViewing(null)} />
                      )}
                    </div>
                  );
                })
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
