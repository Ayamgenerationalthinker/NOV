'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { ShoppingBag, ArrowRight, Check } from 'lucide-react';

interface ProductBuyActionsProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    discountPrice?: number | null;
    coverImage?: string | null;
    productType: string;
  };
}

export function ProductBuyActions({ product }: ProductBuyActionsProps) {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);

  const isAlreadyInCart = isInCart(product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      discountPrice: product.discountPrice,
      coverImage: product.coverImage,
      productType: product.productType,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      discountPrice: product.discountPrice,
      coverImage: product.coverImage,
      productType: product.productType,
    });
    router.push('/checkout');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Button
          size="lg"
          onClick={handleBuyNow}
          className="flex-1 gap-2 text-sm font-semibold shadow-lg shadow-blue-600/30"
        >
          Buy Now
          <ArrowRight className="w-4 h-4" />
        </Button>

        <Button
          size="lg"
          variant="secondary"
          onClick={handleAddToCart}
          className="gap-2 text-sm font-semibold"
        >
          {justAdded ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              Added!
            </>
          ) : isAlreadyInCart ? (
            <>
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              In Cart
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              Add to Cart
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Instant delivery directly to your email and customer library.
      </p>
    </div>
  );
}
