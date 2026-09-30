'use client';

import * as React from 'react';
import { productPath } from '@/lib/product-url';
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
  Plus,
  Minus,
  Truck,
  FileCode,
} from 'lucide-react';

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    hasPhysicalItems,
    isLoaded,
  } = useCart();

  const [couponInput, setCouponInput] = React.useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = React.useState(false);
  const [appliedCoupon, setAppliedCoupon] = React.useState<{
    code: string;
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = React.useState<string | null>(null);

  // Shipping Calculation State
  const [selectedCountry, setSelectedCountry] = React.useState('GH');
  const [shippingFee, setShippingFee] = React.useState(0);
  const [shippingMethod, setShippingMethod] = React.useState('Standard Delivery');
  const [isCalculatingShipping, setIsCalculatingShipping] = React.useState(false);

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
            countryCode: selectedCountry,
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
  }, [hasPhysicalItems, selectedCountry, items]);

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
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  if (!isLoaded) {
    return (
      <Container className="py-20 text-center">
        <div className="h-64 rounded-3xl bg-zinc-900/40 animate-pulse border border-zinc-800" />
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 md:py-28 text-zinc-100">
        <Container>
          <div className="mx-auto max-w-md text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-500">
              <ShoppingBag className="h-10 w-10" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">Your Shopping Bag is Empty</h1>
              <p className="mt-2 text-xs text-zinc-400">
                Explore our catalog of luxury physical crafts and prime digital assets.
              </p>
            </div>

            <div>
              <Link href="/products">
                <Button size="md" className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-2xl shadow-xl shadow-emerald-950/30">
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
    <div className="py-12 md:py-16 text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <Container>
        {/* Title */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Shopping Bag</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Review your hybrid physical and digital selections before proceeding to checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            Clear Bag
          </button>
        </div>

        {/* Layout Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="border-zinc-800/80 bg-zinc-950 rounded-3xl overflow-hidden shadow-xl">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                        {item.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                        ) : item.productKind === 'PHYSICAL' ? (
                          <Package className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <FileCode className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={productPath(item.slug)}
                            className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors line-clamp-1"
                          >
                            {item.title}
                          </Link>
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono bg-zinc-900 border-zinc-800 text-zinc-400">
                            {item.productKind === 'PHYSICAL' ? 'Physical' : 'Digital'}
                          </Badge>
                        </div>

                        {item.variantTitle && (
                          <p className="text-xs text-zinc-400 font-mono">
                            Option: <span className="text-zinc-200">{item.variantTitle}</span>
                          </p>
                        )}

                        <p className="text-[11px] text-zinc-500">
                          {item.productKind === 'PHYSICAL'
                            ? 'Insured express parcel dispatch'
                            : 'Instant cryptographic file access'}
                        </p>

                        {/* Quantity Controls for Physical Items */}
                        {item.productKind === 'PHYSICAL' && (
                          <div className="flex items-center gap-2 pt-2">
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-1 text-zinc-400 hover:text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-mono font-semibold text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-1 text-zinc-400 hover:text-white"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-white">
                          {formatCurrency((item.discountPrice ?? item.price) * item.quantity, item.currency || 'USD')}
                        </span>
                        {item.discountPrice && (
                          <span className="block text-[10px] font-mono text-zinc-500 line-through">
                            {formatCurrency(item.price * item.quantity, item.currency || 'USD')}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
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
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950 p-5 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                NOV Authenticity & Secure Checkout Guarantee
              </div>
              <p className="text-[11px] leading-relaxed">
                All physical orders are inspected and tracked. Digital deliverables are unlocked automatically upon multi-gateway payment confirmation.
              </p>
            </div>
          </div>

          {/* Order Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-zinc-800/80 bg-zinc-950 rounded-3xl sticky top-24 shadow-2xl">
              <CardContent className="p-6 space-y-5">
                <h2 className="text-base font-bold text-white">Bag Summary</h2>

                {/* Shipping Estimator if physical items exist */}
                {hasPhysicalItems && (
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-400" /> Delivery Country
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        {isCalculatingShipping ? 'Calculating...' : shippingMethod}
                      </span>
                    </div>

                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="GH">Ghana (Domestic Dispatch)</option>
                      <option value="NG">Nigeria (West Africa)</option>
                      <option value="US">United States (International Courier)</option>
                      <option value="GB">United Kingdom (International Courier)</option>
                      <option value="EU">European Union (International)</option>
                    </select>
                  </div>
                )}

                {/* Subtotal / Discount / Shipping / Total */}
                <div className="space-y-3 text-xs border-b border-zinc-800 pb-4">
                  <div className="flex justify-between text-zinc-300">
                    <span>Subtotal</span>
                    <span className="font-semibold font-mono text-white">{formatCurrency(subtotal)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Discount ({appliedCoupon.code})
                      </span>
                      <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-300">
                    <span>Shipping Fee</span>
                    <span className="font-mono text-white">
                      {shippingFee === 0 ? 'Free / Digital' : formatCurrency(shippingFee)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-semibold text-white">Total Due</span>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-white">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Coupon Input Form */}
                <form onSubmit={handleApplyCoupon} className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Coupon Code
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. NOV20"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      disabled={Boolean(appliedCoupon)}
                      className="h-10 flex-1 uppercase rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 disabled:opacity-50 font-mono"
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
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        className="text-xs bg-zinc-800 text-white hover:bg-zinc-700 rounded-xl"
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
                    <Button size="lg" className="w-full gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider text-xs py-4 rounded-2xl shadow-xl shadow-emerald-950/40">
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
