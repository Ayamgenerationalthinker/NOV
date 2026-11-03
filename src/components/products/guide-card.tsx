import Link from 'next/link';
import { BookOpen, Package } from 'lucide-react';
import { productPath } from '@/lib/product-url';
import type { ShopProduct } from '@/lib/shop-product';
import { cn, formatCurrency } from '@/lib/utils';

/** One guide: sideways on phones, upright from tablet up. The whole card opens the product page. */
export function GuideCard({ product, headingLevel = 3 }: { product: ShopProduct; headingLevel?: 2 | 3 }) {
  const Placeholder = product.isPhysical ? Package : BookOpen;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <article className="group relative flex h-full overflow-hidden rounded-[14px] border border-line bg-card transition-shadow hover:shadow-[0_10px_28px_-16px_rgba(0,22,80,0.35)] sm:flex-col">
      <div className="flex w-[112px] shrink-0 items-center justify-center bg-band p-2 sm:h-[282px] sm:w-full sm:p-6">
        {product.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt=""
            width={300}
            height={400}
            loading="lazy"
            decoding="async"
            className={cn('h-auto max-h-full w-auto max-w-full rounded-md object-contain', product.soldOut && 'opacity-50')}
          />
        ) : (
          <Placeholder className="h-10 w-10 text-ink-soft" aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-bold tracking-wide text-brand-hover">{product.label}</span>
          {product.soldOut && <span className="rounded-md bg-band px-2 py-1 text-xs font-bold text-ink">Sold out</span>}
        </div>
        <Heading className="mt-2 text-[17px] font-bold leading-snug text-ink">
          <Link href={productPath(product.slug)} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </Heading>
        {product.outcome && <p className="mt-1.5 text-sm leading-normal text-ink-soft">{product.outcome}</p>}
        {product.audience && <p className="mt-1.5 text-sm leading-normal text-ink">{product.audience}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
            <span className="text-lg font-bold text-ink">{formatCurrency(product.price, product.currency)}</span>
            {product.wasPrice !== null && (
              <s className="text-sm text-ink-soft">{formatCurrency(product.wasPrice, product.currency)}</s>
            )}
          </p>
          <span aria-hidden className="inline-flex min-h-11 items-center rounded-[10px] border border-line-strong px-3.5 text-[13px] font-semibold text-ink transition-colors group-hover:border-ink">
            View guide
          </span>
        </div>
      </div>
    </article>
  );
}
