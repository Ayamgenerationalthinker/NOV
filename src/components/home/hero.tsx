import Link from 'next/link';
import { ArrowRight, Download, Lock, UserRound } from 'lucide-react';
import { productPath } from '@/lib/product-url';
import type { ShopProduct } from '@/lib/shop-product';
import { formatCurrency } from '@/lib/utils';
import { pageWidth, primaryButton, secondaryButton } from './primitives';

const FACTS = [
  { icon: Lock, text: 'Mobile Money or card' },
  { icon: UserRound, text: 'No account needed' },
  { icon: Download, text: 'Download after payment' },
];

export function Hero({ featured }: { featured: ShopProduct[] }) {
  return (
    <section aria-labelledby="hero-title" className="bg-paper">
      <div className={`${pageWidth} grid items-center gap-8 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-16`}>
        <div className="max-w-2xl">
          <h1 id="hero-title" className="font-serif text-[38px] font-medium leading-[1.08] text-ink lg:text-[64px] lg:leading-[1.04]">
            Practical guides for your money, work and next step.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-soft lg:text-[19px]">
            Short PDF guides for small-business owners, freelancers, students and job seekers. Pay in GH₵, then download
            straight away.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={primaryButton}>
              Explore the guides <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link href="/#goals" className={secondaryButton}>
              Browse by goal
            </Link>
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-sm text-ink sm:flex-row sm:flex-wrap sm:gap-x-5">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {featured.length > 0 && (
          <ul aria-label="Popular starting points" className="grid grid-cols-3 gap-3 lg:gap-4">
            {featured.map((product) => (
              <li key={product.id}>
                <Link href={productPath(product.slug)} className="group flex h-full flex-col rounded-[14px] border border-line bg-card p-2 transition-colors hover:border-ink lg:p-3">
                  <span className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-band">
                    {product.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.coverImage} alt="" width={300} height={400} fetchPriority="high" className="h-full w-full object-contain" />
                    )}
                  </span>
                  <span className="mt-2 block text-[13px] font-semibold leading-snug text-ink">{product.title}</span>
                  <span className="mt-auto block pt-1 text-sm font-bold tabular-nums text-ink">{formatCurrency(product.price, product.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
