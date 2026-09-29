'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import {
  CreditCard,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Package,
  Truck,
  FileCode,
} from 'lucide-react';
import { Suspense } from 'react';

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get('coupon') || searchParams.get('discount_code') || '';
  const initialEmail = searchParams.get('email') || '';
  const initialName = searchParams.get('name') || '';
  const initialPhone = searchParams.get('phone') || '';

  const { items, subtotal, hasPhysicalItems, clearCart, isLoaded } = useCart();

  // Contact Info
  const [email, setEmail] = React.useState(initialEmail);
  const [name, setName] = React.useState(initialName);

  // Shipping Address State (for physical goods)
  const [street, setStreet] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [country, setCountry] = React.useState('GH');
  const [phone, setPhone] = React.useState(initialPhone);

  // Shipping Calculation State
  const [shippingFee, setShippingFee] = React.useState(0);
  const [shippingMethod, setShippingMethod] = React.useState('Standard Delivery');
  const [isCalculatingShipping, setIsCalculatingShipping] = React.useState(false);

  // Payment Selection
  const [paymentProvider, setPaymentProvider] = React.useState<'FLUTTERWAVE' | 'PAYSTACK'>('FLUTTERWAVE');
  const [couponCode, setCouponCode] = React.useState(initialCoupon);
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pre-fill user profile
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

  // Validate coupon if passed in query
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
            setCouponCode(data.coupon.code);
            setDiscountAmount(data.discountAmount);
          }
        })
        .catch(() => {});
    }
  }, [initialCoupon, subtotal]);

  // Dynamic shipping calculation
  React.useEffect(() => {
    if (!hasPhysicalItems) {
      setShippingFee(0);
      setShippingMethod('Instant Digital Delivery');
      return;
    }

    async function updateShipping() {
      setIsCalculatingShipping(true);
      try {
        const res = await fetch('/api/shipping/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            countryCode: country,
            items: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId || undefined,
              quantity: i.quantity,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setShippingFee(data.shippingFee);
          setShippingMethod(data.method);
        }
      } catch (err) {
        console.error('Failed to calculate shipping', err);
      } finally {
        setIsCalculatingShipping(false);
      }
    }

    updateShipping();
  }, [hasPhysicalItems, country, items]);

  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (items.length === 0) {
      setError('Your shopping bag is empty.');
      setIsLoading(false);
      return;
    }

    if (hasPhysicalItems && (!street.trim() || !city.trim() || !phone.trim())) {
      setError('Please provide a complete shipping address and contact phone number.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: item.quantity,
        })),
        guestEmail: email.trim(),
        guestName: name.trim() || undefined,
        couponCode: couponCode ? couponCode.trim() : undefined,
        currency: 'USD',
        paymentProvider,
        shippingAddress: hasPhysicalItems
          ? {
              fullName: name.trim() || 'Valued Customer',
              street: street.trim(),
              city: city.trim(),
              state: state.trim() || undefined,
              postalCode: postalCode.trim() || undefined,
              country,
              phone: phone.trim(),
            }
          : undefined,
        shippingMethod,
      };

      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create checkout session.');
        setIsLoading(false);
        return;
      }

      clearCart();

      // If free order or simulation mode redirect to confirmation
      if (data.status === 'PAID' || !data.paymentUrl) {
        router.push(`/checkout/success?order_id=${data.orderId}&order_number=${data.orderNumber}`);
      } else {
        // Authoritative redirect to payment gateway URL
        window.location.href = data.paymentUrl;
      }
    } catch {
      setError('An unexpected network error occurred.');
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <Container className="py-20 text-center">
        <div className="h-64 rounded-3xl bg-zinc-900/40 animate-pulse border border-zinc-800" />
      </Container>
    );
  }

  return (
    <div className="py-12 md:py-16 text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <Container>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Secure Checkout</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Complete your customer information and select your payment method.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-800/60 bg-red-950/40 p-4 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Customer Details */}
            <Card className="border-zinc-800/80 bg-zinc-950 rounded-3xl overflow-hidden shadow-xl">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
                  1. Contact Information
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address (for order receipts & tracking) *"
                    type="email"
                    placeholder="sarah@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Input
                    label="Full Name *"
                    placeholder="Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address (if physical items present) */}
            {hasPhysicalItems && (
              <Card className="border-zinc-800/80 bg-zinc-950 rounded-3xl overflow-hidden shadow-xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Truck className="w-4 h-4" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider">
                      2. Shipping & Delivery Address
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Street Address *"
                      placeholder="14 Independence Avenue"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="City *"
                        placeholder="Accra / Kumasi / London"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />

                      <Input
                        label="State / Region"
                        placeholder="Greater Accra"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                      />

                      <Input
                        label="Postal Code"
                        placeholder="00233"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                          Country *
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                        >
                          <option value="GH">Ghana (GH)</option>
                          <option value="NG">Nigeria (NG)</option>
                          <option value="US">United States (US)</option>
                          <option value="GB">United Kingdom (GB)</option>
                          <option value="CA">Canada (CA)</option>
                        </select>
                      </div>

                      <Input
                        label="Phone Number (for courier delivery SMS) *"
                        type="tel"
                        placeholder="+233 24 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Provider Selection */}
            <Card className="border-zinc-800/80 bg-zinc-950 rounded-3xl overflow-hidden shadow-xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider">
                    {hasPhysicalItems ? '3. Payment Gateway' : '2. Payment Gateway'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setPaymentProvider('FLUTTERWAVE')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentProvider === 'FLUTTERWAVE'
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-md'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">Flutterwave Gateway</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Cards (Visa, Mastercard, Amex), Ghana Mobile Money (MTN, Telecel, AT), and African local wallets.
                    </p>
                  </div>

                  <div
                    onClick={() => setPaymentProvider('PAYSTACK')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      paymentProvider === 'PAYSTACK'
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-md'
                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">Paystack Gateway</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Debit/Credit cards, Mobile Money, Bank Transfer, and Apple Pay.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-zinc-800/80 bg-zinc-950 rounded-3xl sticky top-24 shadow-2xl">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-base font-bold text-white">Order Summary</h2>

                <div className="divide-y divide-zinc-800/60 max-h-56 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{item.title}</span>
                        {item.variantTitle && (
                          <span className="text-[11px] font-mono text-zinc-400 block">{item.variantTitle}</span>
                        )}
                        <span className="text-[10px] text-zinc-500">Qty: {item.quantity}</span>
                      </div>
                      <span className="font-mono font-medium text-white">
                        {formatCurrency((item.discountPrice ?? item.price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5 text-xs border-t border-zinc-800 pt-3">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-mono">
                      <span>Discount ({couponCode})</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-400">
                    <span>Shipping Fee</span>
                    <span className="font-mono text-white">
                      {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-2xl font-black font-mono text-white">{formatCurrency(finalTotal)}</span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading}
                  className="w-full gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider text-xs py-4 rounded-2xl shadow-xl shadow-emerald-950/40"
                >
                  <Lock className="w-4 h-4" />
                  {isLoading ? 'Connecting to Gateway...' : `Pay ${formatCurrency(finalTotal)}`}
                </Button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 pt-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>256-Bit SSL Encrypted Transaction</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Container>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-zinc-500">Loading checkout...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
