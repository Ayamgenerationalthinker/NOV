'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { ShoppingBag, ArrowRight, Check, Plus, Minus, Package, ShieldCheck } from 'lucide-react';
import { ProductKind } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

export interface ProductVariantData {
  id: string;
  sku: string;
  title: string;
  option1Name?: string | null;
  option1Value?: string | null;
  option2Name?: string | null;
  option2Value?: string | null;
  price: number;
  salePrice?: number | null;
  inventoryQuantity: number;
  isAvailable: boolean;
}

interface ProductBuyActionsProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    discountPrice?: number | null;
    currency: string;
    coverImage?: string | null;
    productType: string;
    productKind: ProductKind;
    variants?: ProductVariantData[];
  };
}

export function ProductBuyActions({ product }: ProductBuyActionsProps) {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);

  const isPhysical = product.productKind === ProductKind.PHYSICAL;
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariantData | null>(
    hasVariants ? product.variants![0] : null
  );

  const [quantity, setQuantity] = React.useState(1);

  // Active price based on variant or product base
  const activePrice = selectedVariant
    ? selectedVariant.salePrice ?? selectedVariant.price
    : product.discountPrice ?? product.price;

  const inStock = selectedVariant
    ? selectedVariant.inventoryQuantity
    : isPhysical ? 10 : 999;

  const isSoldOut = isPhysical && inStock <= 0;
  const isAlreadyInCart = isInCart(product.id, selectedVariant?.id);

  const handleAddToCart = () => {
    if (isSoldOut) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      variantTitle: selectedVariant?.title,
      sku: selectedVariant?.sku,
      productKind: product.productKind,
      title: product.title,
      slug: product.slug,
      price: selectedVariant ? selectedVariant.price : product.price,
      discountPrice: selectedVariant
        ? selectedVariant.salePrice
        : product.discountPrice,
      coverImage: product.coverImage,
      productType: product.productType,
      quantity: isPhysical ? quantity : 1,
      currency: product.currency,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isSoldOut) return;

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      variantTitle: selectedVariant?.title,
      sku: selectedVariant?.sku,
      productKind: product.productKind,
      title: product.title,
      slug: product.slug,
      price: selectedVariant ? selectedVariant.price : product.price,
      discountPrice: selectedVariant
        ? selectedVariant.salePrice
        : product.discountPrice,
      coverImage: product.coverImage,
      productType: product.productType,
      quantity: isPhysical ? quantity : 1,
      currency: product.currency,
    });

    router.push('/checkout');
  };

  return (
    <div className="space-y-6">
      {/* Variant Selector (if available) */}
      {hasVariants && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider">
            <span className="text-zinc-400">Select Option / Size</span>
            <span className="text-emerald-400 font-semibold">{selectedVariant?.sku}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {product.variants!.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isVarOutOfStock = isPhysical && variant.inventoryQuantity <= 0;

              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isVarOutOfStock}
                  onClick={() => setSelectedVariant(variant)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-lg shadow-emerald-950/30'
                      : isVarOutOfStock
                      ? 'border-zinc-900 bg-zinc-950 text-zinc-600 cursor-not-allowed opacity-50'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{variant.title}</div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1">
                    {formatCurrency(variant.salePrice ?? variant.price, product.currency)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Availability & Quantity Controls */}
      {isPhysical && (
        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80">
          <div className="space-y-0.5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Availability</span>
            <p className="text-xs font-medium text-white flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              {inStock > 5 ? (
                <span className="text-emerald-400">In Stock Ready to Dispatch</span>
              ) : inStock > 0 ? (
                <span className="text-amber-400 font-bold">Only {inStock} units left!</span>
              ) : (
                <span className="text-red-400">Out of Stock</span>
              )}
            </p>
          </div>

          {inStock > 0 && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-xs font-mono font-bold text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(inStock, q + 1))}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          size="lg"
          disabled={isSoldOut}
          onClick={handleBuyNow}
          className="flex-1 gap-2 text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl shadow-xl shadow-emerald-950/40 py-4 transition-all"
        >
          {isSoldOut ? 'Sold Out' : 'Instant Checkout'}
          <ArrowRight className="w-4 h-4" />
        </Button>

        <Button
          size="lg"
          variant="secondary"
          disabled={isSoldOut}
          onClick={handleAddToCart}
          className="gap-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-2xl py-4"
        >
          {justAdded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Added to Cart!
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4 text-zinc-400" />
              Add to Bag
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500 font-mono tracking-tight pt-2 border-t border-zinc-900">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Encrypted Multi-Gateway Checkout
        </span>
        <span>•</span>
        <span>{isPhysical ? 'Tracked Express Shipping' : 'Instant File Access'}</span>
      </div>
    </div>
  );
}
