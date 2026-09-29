import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight, Sparkles, Box, FileCode, Package, ShoppingBag } from 'lucide-react';
import { ProductType, ProductKind } from '@prisma/client';

export interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    brand?: string | null;
    productKind?: ProductKind;
    coverImage?: string | null;
    model3dUrl?: string | null;
    price: number;
    discountPrice?: number | null;
    currency: string;
    isFeatured?: boolean;
    productType: ProductType;
    categories?: Array<{ category: { name: string; slug: string } }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;

  const isPhysical = product.productKind === ProductKind.PHYSICAL;
  const has3D = Boolean(product.model3dUrl);

  const discountPercent = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  return (
    <Card className="group relative flex flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950 hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/20">
      {/* Cover / Image Area */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-900 flex items-center justify-center border-b border-zinc-800/80">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 group-hover:text-emerald-400 transition-colors p-6">
            <div className="rounded-2xl bg-zinc-950 p-6 border border-zinc-800 mb-3">
              {isPhysical ? <Package className="w-8 h-8" /> : <FileCode className="w-8 h-8" />}
            </div>
            <span className="text-xs uppercase tracking-wider font-mono font-medium text-zinc-500">
              {isPhysical ? 'Physical Craft' : 'Digital Deliverable'}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <Badge className="gap-1 bg-emerald-500 text-black font-semibold text-[10px] uppercase tracking-wider border-none shadow-md">
              <Sparkles className="w-3 h-3" />
              Featured
            </Badge>
          )}

          {hasDiscount && (
            <Badge className="bg-red-500 text-white font-mono font-bold text-[10px] border-none shadow-md">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {has3D && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
              <Box className="w-3 h-3" />
              3D View
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-black/70 backdrop-blur-md text-zinc-300 border border-zinc-800">
            {isPhysical ? 'Physical' : 'Digital'}
          </span>
        </div>
      </div>

      <CardContent className="flex-1 p-5 space-y-2.5">
        {product.brand && (
          <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500">
            {product.brand}
          </p>
        )}

        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-semibold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
            {product.title}
          </h3>
        </Link>

        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {product.shortDescription || product.description}
        </p>
      </CardContent>

      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-zinc-800/40 mt-auto">
        <div className="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-lg font-bold font-mono text-white">
                {formatCurrency(product.discountPrice!, product.currency)}
              </span>
              <span className="text-xs font-mono text-zinc-500 line-through">
                {formatCurrency(product.price, product.currency)}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold font-mono text-white">
              {formatCurrency(product.price, product.currency)}
            </span>
          )}
        </div>

        <Link href={`/products/${product.slug}`}>
          <Button variant="secondary" size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl gap-1 text-xs">
            View
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
