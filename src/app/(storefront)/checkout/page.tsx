'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Globe2,
  Package,
} from 'lucide-react';

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get('coupon') || '';

  const { items, subtotal, clearCart, isLoaded } = useCart();

  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [paymentProvider, setPaymentProvider] = React.useState<'CARD' | 'FLUTTERWAVE' | 'PAYSTACK'>('CARD');
  const [couponCode, setCouponCode] = React.useState(initialCoupon);
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check if user is logged in to pre-fill email
  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email) {
          setEmail(data.user.email);
          if (data.user.name) setName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  // Check coupon if passed in query
  React.useEffect(() => {
    if (initialCoupon && subtotal > 0) {
      fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: initialCoupon, subtotal }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            setDiscountAmount(data.discountAmount);
          }
        })
        .catch(() => {});
    }
  }, [initialCoupon, subtotal]);

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId })),
          guestEmail: email,
          guestName: name || undefined,
          couponCode: couponCode || undefined,
          paymentProvider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process checkout. Please try again.');
        setIsLoading(false);
        return;
      }

      // Clear the local shopping cart
      clearCart();

      // Redirect to order success page
      router.push(`/checkout/success?orderId=${data.orderId}&orderNumber=${data.orderNumber}`);
    } catch {
      setError('An unexpected network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return <div className="h-64 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800" />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Package className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Your cart is empty</h2>
        <p className="text-xs text-slate-400">Add digital products to your cart before proceeding to checkout.</p>
        <Link href="/products" className="inline-block mt-2">
          <Button size="sm">Browse Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer Details & Payment Options (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/40 p-4 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Contact Information */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span>1. Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Email Address (for download delivery)"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Full Name (optional)"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span>2. Select Payment Method</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentProvider === 'CARD'
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="CARD"
                    checked={paymentProvider === 'CARD'}
                    onChange={() => setPaymentProvider('CARD')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">Credit / Debit Card</p>
                    <p className="text-[11px] text-slate-400">Visa, Mastercard, American Express</p>
                  </div>
                </div>
                <CreditCard className="w-5 h-5 text-slate-400" />
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentProvider === 'FLUTTERWAVE'
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="FLUTTERWAVE"
                    checked={paymentProvider === 'FLUTTERWAVE'}
                    onChange={() => setPaymentProvider('FLUTTERWAVE')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">Flutterwave</p>
                    <p className="text-[11px] text-slate-400">African Mobile Money (M-Pesa, MTN, Telecel, Airtel) & Cards</p>
                  </div>
                </div>
                <Globe2 className="w-5 h-5 text-amber-400" />
              </label>

              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentProvider === 'PAYSTACK'
                    ? 'border-blue-500 bg-blue-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    value="PAYSTACK"
                    checked={paymentProvider === 'PAYSTACK'}
                    onChange={() => setPaymentProvider('PAYSTACK')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">Paystack</p>
                    <p className="text-[11px] text-slate-400">Direct Bank Transfer, USSD, and Card processing</p>
                  </div>
                </div>
                <Globe2 className="w-5 h-5 text-teal-400" />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Review & Submit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-800 bg-slate-900/80 sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Order Review ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-slate-800/80 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400">Digital Deliverable</p>
                    </div>
                    <span className="font-semibold text-white shrink-0">
                      {formatCurrency(item.discountPrice ?? item.price)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({couponCode})</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-2xl font-black text-white">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 mt-2 shadow-lg shadow-blue-500/20"
                isLoading={isLoading}
              >
                <Lock className="w-4 h-4" />
                Pay & Unlock Instant Downloads
                <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-bit encrypted checkout</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <div className="py-12 md:py-16">
      <Container>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Secure Checkout</h1>
            <p className="text-xs text-slate-400 mt-1">
              Complete your payment to receive immediate digital asset access and verified library license.
            </p>
          </div>

          <React.Suspense fallback={<div className="h-64 rounded-xl bg-slate-900/50 animate-pulse border border-slate-800" />}>
            <CheckoutForm />
          </React.Suspense>
        </div>
      </Container>
    </div>
  );
}
