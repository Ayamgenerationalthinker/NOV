'use client';

import * as React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingBag,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, clearCart, subtotal, isLoaded } = useCart();

  const [couponInput, setCouponInput] = React.useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = React.useState(false);
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = React.useState<string | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponError(null);
    setCouponSuccess(null);
    setIsValidatingCoupon(true);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setCouponError(data.message || 'Invalid coupon code.');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
          finalTotal: data.finalTotal,
        });
        setCouponSuccess(`Coupon "${data.coupon.code}" applied! Saved ${formatCurrency(data.discountAmount)}`);
      }
    } catch {
      setCouponError('Network error checking coupon.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  if (!isLoaded) {
    return (
      <Container className="py-20 text-center">
        <div className="h-64 rounded-xl bg-slate-900/40 animate-pulse border border-slate-800" />
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 md:py-28">
        <Container>
          <div className="mx-auto max-w-md text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500">
              <ShoppingBag className="h-10 w-10" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">Your Shopping Cart is Empty</h1>
              <p className="mt-2 text-xs text-slate-400">
                Explore our catalog of ebooks, templates, audio, and developer software assets.
              </p>
            </div>

            <div>
              <Link href="/products">
                <Button size="md" className="gap-2 shadow-lg shadow-blue-500/20">
                  Explore Products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16">
      <Container>
        {/* Title */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Shopping Cart</h1>
            <p className="text-xs text-slate-400 mt-1">
              Review your items before proceeding to instant digital delivery.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-xs text-slate-400 hover:text-red-400"
          >
            Clear Cart
          </Button>
        </div>

        {/* Layout Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {items.map((item) => (
              <Card key={item.productId} className="border-slate-800 bg-slate-900/60 overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        <Package className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/${item.slug}`}
                            className="text-sm font-semibold text-white hover:text-blue-400 transition-colors line-clamp-1"
                          >
                            {item.title}
                          </Link>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.productType}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Instant download • Lifetime updates included
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <span className="text-sm font-bold text-white">
                          {formatCurrency(item.discountPrice ?? item.price)}
                        </span>
                        {item.discountPrice && (
                          <span className="block text-[10px] text-slate-500 line-through">
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Guarantees Box */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 font-medium text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero Risk Direct Digital Delivery
              </div>
              <p className="text-[11px] leading-relaxed">
                Immediately upon payment verification, files are accessible in your personal library and delivered via secure temporary signed download URLs.
              </p>
            </div>
          </div>

          {/* Order Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-slate-800 bg-slate-900/80 sticky top-24">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-base font-bold text-white">Order Summary</h2>

                {/* Subtotal / Discount / Total */}
                <div className="space-y-3 text-xs border-b border-slate-800 pb-4">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Discount ({appliedCoupon.code})
                      </span>
                      <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Tax</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-semibold text-white">Total Due</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">{formatCurrency(finalTotal)}</span>
                    <span className="block text-[10px] text-slate-400">USD</span>
                  </div>
                </div>

                {/* Coupon Input Form */}
                <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2">
                  <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    Promotional Coupon Code
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. NOV20"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      disabled={Boolean(appliedCoupon)}
                      className="h-9 flex-1 uppercase rounded-lg border border-slate-700 bg-slate-800/80 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />

                    {appliedCoupon ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        size="sm"
                        variant="secondary"
                        isLoading={isValidatingCoupon}
                        disabled={!couponInput.trim()}
                        className="text-xs"
                      >
                        Apply
                      </Button>
                    )}
                  </div>

                  {couponError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {couponSuccess && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{couponSuccess}</span>
                    </div>
                  )}
                </form>

                {/* Checkout Button */}
                <div className="pt-3">
                  <Link
                    href={`/checkout${appliedCoupon ? `?coupon=${appliedCoupon.code}` : ''}`}
                    className="block"
                  >
                    <Button size="lg" className="w-full gap-2 shadow-lg shadow-blue-500/20">
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Instant Access
                  </span>
                  <span>•</span>
                  <span>SSL Encrypted Checkout</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
