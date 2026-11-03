import Link from 'next/link';
import { ArrowRight, Download, Lock, UserRound } from 'lucide-react';
import { productPath } from '@/lib/product-url';
import { CoverImage } from '@/components/products/cover-image';
import type { ShopProduct } from '@/lib/shop-product';
import { cn, formatCurrency } from '@/lib/utils';
import { inverseButton, pageWidth, primaryButton } from './primitives';

const FACTS = [
  { icon: Lock, text: 'Mobile Money or card' },
  { icon: UserRound, text: 'No account needed' },
  { icon: Download, text: 'Download after payment' },
];

/** Fanned covers, drawn back to front: left, right, then the featured one in the middle. */
const FAN = ['left-0 top-12 w-[40%] -rotate-[8deg]', 'right-0 top-12 w-[40%] rotate-[8deg]', 'left-1/2 top-0 z-10 w-[48%] -translate-x-1/2'];

interface HeroProps {
  featured: ShopProduct[];
  total: number;
  /** Lowest price in the shop, already formatted. */
  fromPrice: string | null;
}

export function Hero({ featured, total, fromPrice }: HeroProps) {
  const [front, ...rest] = featured;
  const fan = front ? [...rest.slice(0, 2), front] : [];
  const slots = FAN.slice(FAN.length - fan.length);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_65%_at_80%_35%,rgba(11,92,255,0.55),transparent_70%),radial-gradient(40%_50%_at_10%_100%,rgba(11,92,255,0.28),transparent_70%)]"
      />
      <div className={cn(pageWidth, 'relative grid items-center gap-10 pb-12 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-24 lg:pt-20')}>
        <div className="max-w-2xl">
          {total > 0 && (
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[#5b93ff]" />
              {total} practical guides{fromPrice ? `, from ${fromPrice}` : ''}
            </p>
          )}
          <h1 id="hero-title" className="mt-5 font-heading text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[52px] lg:text-[66px]">
            Practical guides for your money, work and <span className="text-[#7aa9ff]">next step.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 lg:text-lg">
            Short PDF guides for small-business owners, freelancers, students and job seekers. Pay in GH₵, then download
            straight away.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={primaryButton}>
              Explore the guides <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link href="/#goals" className={inverseButton}>
              Browse by goal
            </Link>
          </div>
          <ul className="mt-7 flex flex-col gap-2.5 text-sm text-white/85 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[#7aa9ff]" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {front && (
          <div className="relative mx-auto aspect-[5/4] w-full max-w-[290px] min-[400px]:max-w-[330px] sm:max-w-[540px]">
            <div aria-hidden className="absolute inset-x-[6%] bottom-[6%] top-[16%] rounded-[40px] bg-white/[0.06] ring-1 ring-white/10" />
            <ul aria-label="Popular starting points">
              {fan.map((product, i) => (
                <li key={product.id} className={cn('absolute', slots[i])}>
                  <Link
                    href={productPath(product.slug)}
                    className="block rounded-2xl bg-white p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 hover:-translate-y-2 motion-reduce:hover:translate-y-0"
                  >
                    <span className="sr-only">
                      {product.title}, {formatCurrency(product.price, product.currency)}
                    </span>
                    {product.coverImage && (
                      <CoverImage src={product.coverImage} sizes="(max-width: 639px) 150px, 260px" priority className="aspect-[3/4] w-full rounded-xl object-cover" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <p aria-hidden className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-2xl bg-white px-4 py-3 text-ink shadow-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Download className="h-5 w-5" />
              </span>
              <span>
                <span className="block max-w-[200px] truncate text-sm font-bold sm:max-w-none">{front.title}</span>
                <span className="block text-sm text-ink-soft">{formatCurrency(front.price, front.currency)} · instant PDF</span>
              </span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
