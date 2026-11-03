import Link from 'next/link';
import { ArrowUpRight, BookOpen, Package } from 'lucide-react';
import { productPath } from '@/lib/product-url';
import { CoverImage } from './cover-image';
import type { ShopProduct } from '@/lib/shop-product';
import { cn, formatCurrency } from '@/lib/utils';

/** One guide: sideways on phones, upright from tablet up. The whole card opens the product page. */
export function GuideCard({ product, headingLevel = 3 }: { product: ShopProduct; headingLevel?: 2 | 3 }) {
  const Placeholder = product.isPhysical ? Package : BookOpen;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <article className="group relative flex h-full overflow-hidden rounded-3xl border border-line bg-card shadow-[0_1px_2px_rgba(0,22,80,0.04)] transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_24px_48px_-24px_rgba(0,22,80,0.35)] motion-reduce:hover:translate-y-0 sm:flex-col">
      <div className="relative flex w-[118px] shrink-0 items-center justify-center bg-gradient-to-br from-band to-[#dce7ff] p-2.5 sm:h-[270px] sm:w-full sm:p-7">
        {product.coverImage ? (
          <CoverImage
            src={product.coverImage}
            sizes="(max-width: 639px) 110px, 240px"
            className={cn(
              'h-auto max-h-full w-auto max-w-full rounded-lg object-contain shadow-[0_16px_30px_-14px_rgba(0,22,80,0.55)] transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100',
              product.soldOut && 'opacity-50',
            )}
          />
        ) : (
          <Placeholder className="h-10 w-10 text-ink-soft" aria-hidden />
        )}
        <span className="absolute left-3 top-3 hidden rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-ink sm:inline">{product.label}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-5">
        <span className="w-fit rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-hover sm:hidden">{product.label}</span>
        {product.soldOut && <span className="mt-1 w-fit rounded-full bg-band px-2.5 py-0.5 text-xs font-bold text-ink">Sold out</span>}
        <Heading className="mt-1.5 font-heading text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink sm:mt-0 sm:text-lg">
          <Link href={productPath(product.slug)} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </Heading>
        {product.outcome && <p className="mt-1.5 text-sm leading-normal text-ink-soft">{product.outcome}</p>}
        {product.audience && <p className="mt-2 text-sm font-semibold text-ink">{product.audience}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <p className="flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
            <span className="text-xl font-extrabold text-ink">{formatCurrency(product.price, product.currency)}</span>
            {product.wasPrice !== null && <s className="text-sm text-ink-soft">{formatCurrency(product.wasPrice, product.currency)}</s>}
          </p>
          <span
            aria-hidden
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brand-soft px-3 text-sm font-bold text-brand-hover transition-colors group-hover:bg-brand group-hover:text-white sm:px-4"
          >
            <span className="hidden sm:inline">View guide</span> <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
