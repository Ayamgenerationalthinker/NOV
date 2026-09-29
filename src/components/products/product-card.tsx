import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight, Package, FileCode } from 'lucide-react';
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

  return (
    <Card className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-800/80 bg-stone-950/90 hover:border-stone-700 transition-all duration-300">
      {/* Editorial Image Area */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-900 border-b border-stone-800/70">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.title}
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-stone-600 p-6">
            <div className="rounded-xl bg-stone-950 p-4 border border-stone-800 mb-2">
              {isPhysical ? <Package className="w-6 h-6 text-stone-500" /> : <FileCode className="w-6 h-6 text-stone-500" />}
            </div>
            <span className="text-[10px] uppercase tracking-widest font-mono text-stone-500">
              {isPhysical ? 'Physical Piece' : 'Digital Edition'}
            </span>
          </div>
        )}

        {/* Minimalist Subtle Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.isFeatured && (
            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase bg-stone-900/90 text-amber-300 border border-amber-900/40 backdrop-blur-sm">
              Featured
            </span>
          )}
          {hasDiscount && (
            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase bg-stone-900/90 text-stone-300 border border-stone-800 backdrop-blur-sm">
              Sale
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase bg-stone-950/80 text-stone-400 border border-stone-800/80 backdrop-blur-sm">
            {isPhysical ? 'Physical' : 'Digital'}
          </span>
        </div>
      </div>

      <CardContent className="flex-1 p-4 space-y-1.5">
        {product.brand && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            {product.brand}
          </p>
        )}

        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-serif text-sm font-medium text-stone-100 group-hover:text-amber-200 transition-colors line-clamp-1">
            {product.title}
          </h3>
        </Link>

        <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed font-sans">
          {product.shortDescription || product.description}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-stone-900 mt-auto">
        <div className="flex items-baseline gap-1.5 pt-2">
          {hasDiscount ? (
            <>
              <span className="text-sm font-medium font-mono text-stone-100">
                {formatCurrency(product.discountPrice!, product.currency)}
              </span>
              <span className="text-[11px] font-mono text-stone-500 line-through">
                {formatCurrency(product.price, product.currency)}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium font-mono text-stone-100">
              {formatCurrency(product.price, product.currency)}
            </span>
          )}
        </div>

        <Link href={`/products/${product.slug}`} className="pt-2">
          <span className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1 transition-colors">
            Inspect <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </CardFooter>
    </Card>
  );
}
