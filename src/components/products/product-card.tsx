import Link from 'next/link';
import { BookOpen, Package } from 'lucide-react';
import { productPath } from '@/lib/product-url';
import { formatCurrency } from '@/lib/utils';
import { availableStock } from '@/lib/product-purchase';

export interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    productKind?: 'DIGITAL' | 'PHYSICAL';
    productType?: string;
    coverImage?: string | null;
    price: number;
    discountPrice?: number | null;
    currency: string;
    variants?: Array<{ inventoryQuantity: number; reservedQuantity: number; isAvailable: boolean }>;
  };
}

const TYPE_LABELS: Record<string, string> = {
  EBOOK: 'Ebook',
  COURSE: 'Course',
  TEMPLATE: 'Template',
  AUDIO: 'Audio',
  VIDEO: 'Video',
  SOFTWARE: 'Software',
  GRAPHICS: 'Graphics',
};

export function ProductCard({ product }: ProductCardProps) {
  const onSale = product.discountPrice != null && product.discountPrice < product.price;
  const price = onSale ? product.discountPrice! : product.price;
  const isPhysical = product.productKind === 'PHYSICAL';
  const soldOut = isPhysical && (product.variants ?? []).reduce((sum, v) => sum + availableStock(v), 0) === 0;
  const label = isPhysical ? 'Delivered' : TYPE_LABELS[product.productType ?? ''] ?? 'Download';

  return (
    <Link href={productPath(product.slug)} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-stone-800/80 bg-stone-900">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.title}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-600">
            {isPhysical ? <Package className="h-10 w-10" /> : <BookOpen className="h-10 w-10" />}
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {soldOut ? (
            <span className="rounded-full bg-stone-950/85 px-2 py-0.5 text-[11px] font-semibold text-stone-200">Sold out</span>
          ) : onSale ? (
            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-stone-950">
              −{Math.round((1 - price / product.price) * 100)}%
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-2.5 space-y-0.5 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">{label}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-stone-100 group-hover:text-amber-200">{product.title}</h3>
        <p className="text-sm tabular-nums text-stone-200">
          {formatCurrency(price, product.currency)}
          {onSale && <s className="ml-1.5 text-xs text-stone-500">{formatCurrency(product.price, product.currency)}</s>}
        </p>
      </div>
    </Link>
  );
}
