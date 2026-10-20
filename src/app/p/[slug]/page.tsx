import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Download, FileText, Star, Truck, Lock } from 'lucide-react';
import { ProductService } from '@/services/product/product.service';
import { ReviewService } from '@/services/review/review.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { ProductBuyActions } from '@/components/products/product-buy-actions';
import { ProductMediaGallery } from '@/components/products/product-media-gallery';
import { formatCurrency, formatFileSize } from '@/lib/utils';
import { buildProductMetadata } from '@/lib/product-metadata';
import { availableStock, productDisplayPrice, resolveBuyState } from '@/lib/product-purchase';
import { env } from '@/lib/env';
import { productTypeLabel } from '@/lib/product-types';
import Link from 'next/link';
import { BrandLogo } from '@/components/layout/brand-logo';
import { ExpandableText } from '@/components/products/expandable-text';
import { ExpandableList } from '@/components/products/expandable-list';

interface ProductLandingProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Stock and price must always be current.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ProductLandingProps): Promise<Metadata> {
  const { slug } = await params;
  return buildProductMetadata(await ProductService.getProductBySlug(slug));
}

function fileFormat(fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop()! : '';
  return ext ? ext.toUpperCase() : 'File';
}

export default async function ProductLandingPage({ params, searchParams }: ProductLandingProps) {
  const { slug } = await params;
  let product = await ProductService.getProductBySlug(slug);

  // Stock held by abandoned checkouts is freed before we show "In stock" / "Sold out".
  if (product?.isPublished && product.productKind === 'PHYSICAL' && product.variants.some((v) => v.reservedQuantity > 0)) {
    const { releasedCount } = await InventoryService.releaseExpiredReservations().catch(() => ({ releasedCount: 0 }));
    if (releasedCount > 0) product = await ProductService.getProductBySlug(slug);
  }

  // Drafts and unknown slugs look identical to the public.
  if (!product || !product.isPublished) {
    notFound();
  }

  const isPhysical = product.productKind === 'PHYSICAL';
  const query = await searchParams;
  const buyState = resolveBuyState(
    {
      slug: product.slug,
      productKind: product.productKind,
      price: product.price,
      discountPrice: product.discountPrice,
      variants: product.variants,
    },
    query
  );
  const displayPrice = productDisplayPrice(product);
  const defaultVariant = product.variants.find((v) => v.id === buyState.defaultVariantId);
  const savingsPercent =
    displayPrice.compareAtPrice !== null
      ? Math.round((1 - displayPrice.price / displayPrice.compareAtPrice) * 100)
      : 0;

  const reviews = await ReviewService.getProductReviews(product.id, { limit: 5 });
  const hasReviews = reviews.metrics.totalReviews > 0;

  const whatYouGet = product.whatsIncluded.length > 0 ? product.whatsIncluded : product.features;
  const files = product.files;
  const category = isPhysical ? null : productTypeLabel(product.productType);
  const totalFileSize = files.reduce((sum, f) => sum + Number(f.fileSize), 0);
  const formats = Array.from(new Set(files.map((f) => fileFormat(f.fileName))));
  // Many summaries repeat the title or the opening of the description; show them only when they add something.
  const summary = product.shortDescription?.trim() ?? '';
  const showSummary =
    summary.length > 0 && summary !== product.title.trim() && !product.description.includes(summary.slice(0, 120));

  return (
    <div className="min-h-screen bg-stone-950 pb-28 text-stone-100 md:pb-16">
      <header className="border-b border-stone-800/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" aria-label={`${env.NEXT_PUBLIC_APP_NAME} home`} className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            <BrandLogo className="h-8 sm:h-9" />
          </Link>
          <Link href="/products" className="text-sm text-stone-400 hover:text-white">
            More products
          </Link>
        </div>
      </header>

      {/* Phones: a small cover beside the title and price, then everything else full width.
          Larger screens: the cover stays put on the left while the details scroll on the right. */}
      <div
        className={
          isPhysical
            ? 'mx-auto max-w-5xl md:grid md:grid-cols-2 md:gap-x-10 md:px-6 md:pt-10'
            : 'mx-auto grid max-w-5xl grid-cols-[7rem_minmax(0,1fr)] gap-x-4 px-4 pt-5 sm:grid-cols-[9rem_minmax(0,1fr)] md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-x-10 md:px-6 md:pt-10'
        }
      >
        <div className={isPhysical ? 'md:row-span-2' : 'md:sticky md:top-8 md:row-span-2 md:self-start'}>
          <ProductMediaGallery
            coverImage={product.coverImage}
            galleryImages={product.galleryImages}
            model3dUrl={product.model3dUrl}
            model3dPoster={product.model3dPoster}
            productTitle={product.title}
            compact={!isPhysical}
          />
        </div>

        <div className={isPhysical ? 'space-y-3 px-4 pt-5 md:px-0 md:pt-0' : 'min-w-0 space-y-2 self-center md:space-y-3 md:self-start'}>
          {category && (
            <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200 md:text-xs">
              {category}
            </span>
          )}
          <h1 className="break-words text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl md:text-3xl">{product.title}</h1>
          {hasReviews && (
            <a href="#reviews" className="flex items-center gap-2 text-sm">
              <span className="flex text-amber-300" aria-hidden>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-4 w-4 ${n <= Math.round(reviews.metrics.averageRating) ? 'fill-amber-300' : 'text-stone-700'}`} />
                ))}
              </span>
              <span className="text-stone-300">
                {reviews.metrics.averageRating.toFixed(1)} · {reviews.metrics.totalReviews} review{reviews.metrics.totalReviews === 1 ? '' : 's'}
              </span>
            </a>
          )}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular-nums text-2xl font-bold text-white md:text-3xl">{formatCurrency(displayPrice.price, product.currency)}</span>
            {displayPrice.compareAtPrice !== null && (
              <>
                <span className="tabular-nums text-base text-stone-500 line-through">
                  {formatCurrency(displayPrice.compareAtPrice, product.currency)}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">Save {savingsPercent}%</span>
              </>
            )}
          </div>
        </div>

        <div
          className={
            isPhysical
              ? 'mt-5 space-y-6 px-4 md:col-start-2 md:mt-6 md:px-0'
              : 'col-span-2 mt-5 space-y-6 md:col-span-1 md:col-start-2 md:mt-6'
          }
        >
          {showSummary && <p className="text-[15px] leading-relaxed text-stone-300">{product.shortDescription}</p>}

          <ProductBuyActions
            slug={product.slug}
            currency={product.currency}
            isPhysical={isPhysical}
            basePrice={displayPrice}
            baseAvailable={isPhysical ? (defaultVariant ? availableStock(defaultVariant) : 0) : null}
            initial={buyState}
          />

          {isPhysical ? (
            <div className="flex items-start gap-3 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <p>Delivered to your address. We’ll call or WhatsApp you on the number you give at checkout.</p>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-stone-800 bg-stone-800 text-sm">
              <div className="bg-stone-950 p-3.5">
                <dt className="text-xs text-stone-400">Format</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-white">
                  <FileText className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                  {formats.length > 0 ? formats.join(', ') : category}
                </dd>
              </div>
              <div className="bg-stone-950 p-3.5">
                <dt className="text-xs text-stone-400">{files.length > 1 ? `${files.length} files` : 'Size'}</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-white">{totalFileSize > 0 ? formatFileSize(totalFileSize) : '—'}</dd>
              </div>
              <div className="col-span-2 flex items-start gap-2.5 bg-stone-950 p-3.5 text-stone-300">
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                <dt className="sr-only">Delivery</dt>
                <dd>Download right after payment is confirmed, plus a link by email. The file is only available to buyers.</dd>
              </div>
            </dl>
          )}

          <section aria-labelledby="about-title" className="border-t border-stone-800/70 pt-6">
            <h2 id="about-title" className="mb-3 text-lg font-semibold text-white">
              About this {isPhysical ? 'item' : (category ?? 'product').toLowerCase()}
            </h2>
            <ExpandableText text={product.description} />
          </section>

          {whatYouGet.length > 0 && (
            <section className="border-t border-stone-800/70 pt-6">
              <h2 className="mb-3 text-lg font-semibold text-white">What you get</h2>
              <ExpandableList items={whatYouGet} />
            </section>
          )}

          {hasReviews && (
            <section id="reviews" className="border-t border-stone-800/70 pt-6">
              <h2 className="mb-4 text-lg font-semibold text-white">What buyers say</h2>
              <ul className="space-y-4">
                {reviews.reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border border-stone-800 p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex text-amber-300" aria-label={`${review.rating} out of 5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? 'fill-amber-300' : 'text-stone-700'}`} />
                        ))}
                      </span>
                      <span className="text-xs text-stone-400">{review.customerName?.split(' ')[0] || 'Buyer'}</span>
                      {review.isVerifiedPurchase && <span className="text-[11px] text-emerald-400">Verified buyer</span>}
                    </div>
                    {review.title && <p className="font-medium text-white">{review.title}</p>}
                    <p className="text-sm text-stone-300">{review.comment}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="flex items-center justify-center gap-1.5 pb-4 text-xs text-stone-500 md:justify-start">
            <Lock className="h-3.5 w-3.5" /> Secure checkout · Mobile Money or card · GH₵
          </p>
        </div>
      </div>
    </div>
  );
}
