'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Lock, Tag, X } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { formatCurrency } from '@/lib/utils';
import { productPath } from '@/lib/product-url';

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Western North', 'Volta', 'Oti',
  'Northern', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
];

const PENDING_KEY = 'nov_pending_checkout';
const PENDING_MAX_AGE_MS = 25 * 60 * 1000;

const PAYMENT_MESSAGES: Record<string, { title: string; body: string; canRetry: boolean }> = {
  payment_cancelled: { title: 'Payment cancelled', body: 'You cancelled the payment, so no money was taken. You can try again whenever you’re ready.', canRetry: true },
  payment_failed: { title: 'Payment didn’t go through', body: 'The payment was declined or timed out and no money was taken. Please try again, or use a different number or card.', canRetry: true },
  payment_pending: { title: 'Payment still processing', body: 'If you approved the Mobile Money prompt on your phone, give it a minute and tap “Check again”.', canRetry: false },
};
const UNCONFIRMED_MESSAGE = {
  title: 'We couldn’t confirm your payment',
  body: 'If money left your account, don’t pay again. Contact us with your order number and we’ll sort it out. Otherwise you can try again.',
  canRetry: true,
};

interface Line {
  productId: string;
  variantId?: string;
  slug: string;
  title: string;
  optionLabel?: string;
  kind: 'DIGITAL' | 'PHYSICAL';
  quantity: number;
  unitPrice: number;
  compareAtPrice: number | null;
  coverImage: string | null;
  currency: string;
}

const fieldClass =
  'w-full rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-3 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60';
const labelClass = 'mb-1.5 block text-sm font-medium text-stone-300';

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function RetryPanel({ orderId, errorCode }: { orderId: string; errorCode: string }) {
  const router = useRouter();
  const message = PAYMENT_MESSAGES[errorCode] ?? UNCONFIRMED_MESSAGE;
  const [order, setOrder] = React.useState<{ orderNumber: string; status: string; total: number; currency: string; items: Array<{ id: string; product: { title: string; slug: string } }> } | null>(null);
  const [busy, setBusy] = React.useState<'retry' | 'check' | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}`);
    const data = await readJson(res);
    if (!res.ok) {
      setError('We couldn’t find this order.');
      return null;
    }
    setOrder(data.order);
    if (data.order.status === 'PAID') {
      router.replace(`/checkout/success?orderId=${orderId}&orderNumber=${data.order.orderNumber}`);
    }
    return data.order;
  }, [orderId, router]);

  React.useEffect(() => {
    // Fetching on mount; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const retry = async () => {
    setBusy('retry');
    setError(null);
    const res = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, provider: 'PAYSTACK' }),
    });
    const data = await readJson(res);
    if (res.ok && data.paymentUrl) {
      window.location.href = data.paymentUrl;
      return;
    }
    setBusy(null);
    setError(data.error || 'Could not restart the payment. Please try again.');
  };

  const checkAgain = async () => {
    setBusy('check');
    const current = await load();
    setBusy(null);
    if (current && current.status !== 'PAID') setError('Not confirmed yet. Please wait a little longer, then check again.');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
          <AlertCircle className="h-5 w-5" /> {message.title}
        </h1>
        <p className="mt-1 text-sm text-stone-300">{message.body}</p>
      </div>

      {order && (
        <div className="rounded-2xl border border-stone-800 p-4 text-sm">
          <div className="text-stone-400">Order {order.orderNumber}</div>
          {order.items.map((i) => (
            <div key={i.id} className="mt-1 text-white">{i.product.title}</div>
          ))}
          <div className="mt-2 font-mono text-lg font-bold text-white">{formatCurrency(order.total, order.currency)}</div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-col gap-3">
        {message.canRetry && order && order.status !== 'PAID' && (
          <button type="button" onClick={retry} disabled={busy !== null} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 font-bold text-stone-950 disabled:opacity-60">
            {busy === 'retry' && <Loader2 className="h-4 w-4 animate-spin" />} Try again
          </button>
        )}
        <button type="button" onClick={checkAgain} disabled={busy !== null} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-700 font-semibold text-stone-100 disabled:opacity-60">
          {busy === 'check' && <Loader2 className="h-4 w-4 animate-spin" />} Check again
        </button>
        {order?.items[0] && (
          <Link href={productPath(order.items[0].product.slug)} className="text-center text-sm text-stone-400 underline">
            Back to the product
          </Link>
        )}
      </div>
    </div>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cart = useCart();

  const productSlug = searchParams.get('product');
  const variantParam = searchParams.get('variant');
  const quantityParam = parseInt(searchParams.get('quantity') || '1', 10);
  const initialCoupon = (searchParams.get('coupon') || searchParams.get('discount_code') || '').trim();

  const [productLines, setProductLines] = React.useState<Line[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Cart fallback (when checkout is opened without ?product=)
  const cartLines = React.useMemo<Line[]>(
    () =>
      cart.items.map((i) => {
        const onSale = i.discountPrice !== null && i.discountPrice !== undefined && i.discountPrice < i.price;
        return {
          productId: i.productId,
          variantId: i.variantId ?? undefined,
          slug: i.slug,
          title: i.title,
          optionLabel: i.variantTitle && i.variantTitle !== 'Default' ? i.variantTitle : undefined,
          kind: i.productKind as Line['kind'],
          quantity: i.quantity,
          unitPrice: onSale ? i.discountPrice! : i.price,
          compareAtPrice: onSale ? i.price : null,
          coverImage: i.coverImage ?? null,
          currency: i.currency || 'GHS',
        };
      }),
    [cart.items]
  );
  const lines = productSlug ? productLines : cartLines;

  const [name, setName] = React.useState(searchParams.get('name') || '');
  const [email, setEmail] = React.useState(searchParams.get('email') || '');
  const [phone, setPhone] = React.useState(searchParams.get('phone') || '');
  const [region, setRegion] = React.useState('Greater Accra');
  const [city, setCity] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [landmark, setLandmark] = React.useState('');
  const [gps, setGps] = React.useState('');

  const [couponInput, setCouponInput] = React.useState(initialCoupon);
  const [coupon, setCoupon] = React.useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = React.useState<string | null>(null);
  const [shippingFee, setShippingFee] = React.useState(0);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load the single product being bought from the link.
  React.useEffect(() => {
    if (!productSlug) return;
    fetch(`/api/products/${encodeURIComponent(productSlug)}`)
      .then(async (res) => {
        const data = await readJson(res);
        if (!res.ok) throw new Error('This product is no longer available.');
        const p = data.product;
        const isPhysical = p.productKind === 'PHYSICAL';
        let variant = null;
        if (isPhysical) {
          variant = p.variants.find((v: { id: string }) => v.id === variantParam) ?? (p.variants.length === 1 ? p.variants[0] : null);
          if (!variant) throw new Error('Please go back and choose an option.');
          if (variant.available <= 0) throw new Error('Sorry, this item is sold out.');
        }
        const base = variant ? variant.price : p.price;
        const sale = variant ? variant.salePrice : p.discountPrice;
        const onSale = sale !== null && sale !== undefined && sale < base;
        setProductLines([
          {
            productId: p.id,
            variantId: variant?.id,
            slug: p.slug,
            title: p.title,
            optionLabel: variant && variant.option1Value ? variant.title : undefined,
            kind: p.productKind,
            quantity: isPhysical ? Math.max(1, Math.min(Number.isFinite(quantityParam) ? quantityParam : 1, variant.available, 20)) : 1,
            unitPrice: onSale ? sale : base,
            compareAtPrice: onSale ? base : null,
            coverImage: p.coverImage,
            currency: p.currency,
          },
        ]);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [productSlug, variantParam, quantityParam]);

  const hasPhysical = Boolean(lines?.some((l) => l.kind === 'PHYSICAL'));
  const currency = lines?.[0]?.currency || 'GHS';
  const subtotal = Math.round((lines ?? []).reduce((sum, l) => sum + l.unitPrice * l.quantity, 0) * 100) / 100;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, Math.round((subtotal - discount + (hasPhysical ? shippingFee : 0)) * 100) / 100);

  // Delivery fee for physical items (Ghana)
  React.useEffect(() => {
    if (!lines || !hasPhysical) return;
    fetch('/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode: 'GH',
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
      }),
    })
      .then(readJson)
      .then((data) => setShippingFee(Number(data.shippingFee) || 0))
      .catch(() => setShippingFee(0));
  }, [lines, hasPhysical]);

  const applyCoupon = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || subtotal <= 0) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed, subtotal }),
    });
    const data = await readJson(res);
    if (data.valid) {
      setCoupon({ code: trimmed.toUpperCase(), discount: Number(data.discountAmount) || 0 });
      setCouponMessage(null);
    } else {
      setCoupon(null);
      setCouponMessage(data.message || 'That code is not valid.');
    }
  };

  // Apply ?coupon= automatically once, as soon as the price is known.
  const autoApplied = React.useRef(false);
  React.useEffect(() => {
    if (!autoApplied.current && initialCoupon && subtotal > 0) {
      autoApplied.current = true;
      applyCoupon(initialCoupon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCoupon, subtotal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lines || lines.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
      guestName: name.trim(),
      guestEmail: email.trim(),
      phone: phone.trim(),
      couponCode: coupon?.code,
      paymentProvider: 'PAYSTACK',
      shippingAddress: hasPhysical
        ? { street: street.trim(), city: city.trim(), state: region, postalCode: gps.trim() || undefined, landmark: landmark.trim() || undefined, country: 'GH' }
        : undefined,
    };

    try {
      // If this exact checkout already created an order (e.g. the buyer came back from the
      // payment page), restart payment on that order instead of creating a duplicate.
      const signature = JSON.stringify(payload);
      let pending: { signature: string; orderId: string; at: number } | null = null;
      try {
        pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      } catch {
        pending = null;
      }

      if (pending && pending.signature === signature && Date.now() - pending.at < PENDING_MAX_AGE_MS) {
        const res = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: pending.orderId, provider: 'PAYSTACK' }),
        });
        const data = await readJson(res);
        if (res.ok && data.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
        if (res.status === 400 && /already been paid/i.test(data.error || '')) {
          router.push(`/checkout/success?orderId=${pending.orderId}`);
          return;
        }
        // Otherwise fall through and create a fresh order.
      }

      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJson(res);

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ signature, orderId: data.orderId, at: Date.now() }));
      } catch {
        // Private mode: duplicate protection is best-effort only.
      }

      if (!productSlug) cart.clearCart();

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/checkout/success?orderId=${data.orderId}&orderNumber=${data.orderNumber}`);
      }
    } catch {
      setError('Network problem. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-300" />
        <p className="text-stone-200">{loadError}</p>
        {productSlug && (
          <Link href={productPath(productSlug)} className="inline-block text-sm text-amber-300 underline">
            Back to the product
          </Link>
        )}
      </div>
    );
  }

  if (!lines) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-stone-300">There’s nothing to check out.</p>
        <Link href="/" className="text-sm text-amber-300 underline">Go to the shop</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      {/* Order summary */}
      <section className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900/50 p-4">
        {lines.map((l) => (
          <div key={`${l.productId}-${l.variantId ?? ''}`} className="flex gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-800">
              {l.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.coverImage} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-white">{l.title}</div>
              <div className="text-xs text-stone-400">
                {[l.optionLabel, l.kind === 'PHYSICAL' ? `Qty ${l.quantity}` : 'Instant download'].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div className="text-right font-mono text-sm text-white">
              {formatCurrency(l.unitPrice * l.quantity, l.currency)}
              {l.compareAtPrice !== null && (
                <div className="text-xs text-stone-500 line-through">{formatCurrency(l.compareAtPrice * l.quantity, l.currency)}</div>
              )}
            </div>
          </div>
        ))}

        <dl className="space-y-1.5 border-t border-stone-800 pt-3 text-sm">
          <div className="flex justify-between text-stone-400">
            <dt>Subtotal</dt>
            <dd className="font-mono">{formatCurrency(subtotal, currency)}</dd>
          </div>
          {coupon && (
            <div className="flex justify-between text-emerald-300">
              <dt>Discount ({coupon.code})</dt>
              <dd className="font-mono">−{formatCurrency(discount, currency)}</dd>
            </div>
          )}
          {hasPhysical && (
            <div className="flex justify-between text-stone-400">
              <dt>Delivery</dt>
              <dd className="font-mono">{shippingFee > 0 ? formatCurrency(shippingFee, currency) : 'Free'}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-bold text-white">
            <dt>Total</dt>
            <dd className="font-mono">{formatCurrency(total, currency)}</dd>
          </div>
        </dl>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-white">Your details</h2>
        <div>
          <label className={labelClass} htmlFor="co-name">Full name</label>
          <input id="co-name" className={fieldClass} autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="co-email">Email</label>
          <input id="co-email" type="email" inputMode="email" autoComplete="email" required className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          {!hasPhysical && <p className="mt-1 text-xs text-stone-500">We’ll email your download link here.</p>}
        </div>
        <div>
          <label className={labelClass} htmlFor="co-phone">Phone (Mobile Money number)</label>
          <input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" required className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" />
        </div>
      </section>

      {/* Delivery address (physical only) */}
      {hasPhysical && (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white">Delivery address</h2>
          <div>
            <label className={labelClass} htmlFor="co-region">Region</label>
            <select id="co-region" className={fieldClass} value={region} onChange={(e) => setRegion(e.target.value)}>
              {GHANA_REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="co-city">City or town</label>
            <input id="co-city" className={fieldClass} autoComplete="address-level2" required minLength={2} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Accra" />
          </div>
          <div>
            <label className={labelClass} htmlFor="co-street">Area, street and house number</label>
            <input id="co-street" className={fieldClass} autoComplete="street-address" required minLength={3} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="East Legon, 12 Lagos Ave" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="co-landmark">Landmark <span className="text-stone-500">(optional)</span></label>
              <input id="co-landmark" className={fieldClass} value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near the mall" />
            </div>
            <div>
              <label className={labelClass} htmlFor="co-gps">GhanaPost GPS <span className="text-stone-500">(optional)</span></label>
              <input id="co-gps" className={fieldClass} value={gps} onChange={(e) => setGps(e.target.value)} placeholder="GA-123-4567" />
            </div>
          </div>
        </section>
      )}

      {/* Coupon */}
      <section>
        {coupon ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
            <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> {coupon.code} applied</span>
            <button type="button" aria-label="Remove code" onClick={() => { setCoupon(null); setCouponInput(''); }} className="text-emerald-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input aria-label="Discount code" className={`${fieldClass} uppercase`} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Discount code" />
            <button type="button" onClick={() => applyCoupon(couponInput)} className="shrink-0 rounded-xl border border-stone-700 px-4 text-sm font-semibold text-stone-100">
              Apply
            </button>
          </div>
        )}
        {couponMessage && <p className="mt-1.5 text-xs text-red-300">{couponMessage}</p>}
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 py-3.5 text-base font-bold text-stone-950 shadow-lg shadow-amber-900/20 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
          {total === 0 ? 'Get it free' : `Pay ${formatCurrency(total, currency)}`}
        </button>
        <p className="text-center text-xs text-stone-500">Mobile Money or card on the next screen. No account needed.</p>
      </div>
    </form>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const retryOrderId = searchParams.get('order_id');
  const productSlug = searchParams.get('product');

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 pb-16">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href={productSlug ? productPath(productSlug) : '/'}
          aria-label="Back"
          className="rounded-xl border border-stone-800 p-2 text-stone-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-white">Checkout</h1>
      </div>
      {errorCode && retryOrderId ? (
        <RetryPanel orderId={retryOrderId} errorCode={errorCode} />
      ) : (
        <>
          {errorCode && (
            <div role="alert" className="mb-5 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-100">
              {(PAYMENT_MESSAGES[errorCode] ?? UNCONFIRMED_MESSAGE).body}
            </div>
          )}
          <CheckoutForm />
        </>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
        </div>
      }
    >
      <CheckoutContent />
    </React.Suspense>
  );
}
