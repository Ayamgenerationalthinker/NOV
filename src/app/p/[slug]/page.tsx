import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { CheckCircle2, Download, FileText, Star, Truck, Lock } from 'lucide-react';
import { ProductService } from '@/services/product/product.service';
import { ReviewService } from '@/services/review/review.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { ProductBuyActions } from '@/components/products/product-buy-actions';
import { ProductMediaGallery } from '@/components/products/product-media-gallery';
import { formatCurrency, formatFileSize } from '@/lib/utils';
import { buildProductMetadata } from '@/lib/product-metadata';
import { availableStock, productDisplayPrice, resolveBuyState } from '@/lib/product-purchase';
import { env } from '@/lib/env';

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
  const storeName = product.store?.name || env.NEXT_PUBLIC_APP_NAME;

  return (
    <div className="min-h-screen bg-stone-950 pb-28 text-stone-100 md:pb-16">
      <div className="mx-auto max-w-5xl md:px-6 md:pt-8">
        <p className="px-4 py-3 text-center font-serif text-xs uppercase tracking-[0.3em] text-stone-500 md:px-0 md:pb-6 md:pt-0">
          {storeName}
        </p>

        <div className="md:grid md:grid-cols-2 md:gap-10">
          <ProductMediaGallery
            coverImage={product.coverImage}
            galleryImages={product.galleryImages}
            model3dUrl={product.model3dUrl}
            model3dPoster={product.model3dPoster}
            productTitle={product.title}
          />

          <div className="space-y-6 px-4 pt-5 md:px-0 md:pt-0">
            <div className="space-y-3">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{product.title}</h1>

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
                <span className="font-mono text-3xl font-bold text-white">{formatCurrency(displayPrice.price, product.currency)}</span>
                {displayPrice.compareAtPrice !== null && (
                  <>
                    <span className="font-mono text-base text-stone-500 line-through">
                      {formatCurrency(displayPrice.compareAtPrice, product.currency)}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">Save {savingsPercent}%</span>
                  </>
                )}
              </div>
            </div>

            <ProductBuyActions
              slug={product.slug}
              currency={product.currency}
              isPhysical={isPhysical}
              basePrice={displayPrice}
              baseAvailable={isPhysical ? (defaultVariant ? availableStock(defaultVariant) : 0) : null}
              initial={buyState}
            />

            <div className="flex items-start gap-3 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
              {isPhysical ? <Truck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /> : <Download className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />}
              <p>
                {isPhysical
                  ? 'Delivered to your address. We’ll call or WhatsApp you on the number you give at checkout.'
                  : 'Instant download right after payment, plus a download link by email.'}
              </p>
            </div>

            {!isPhysical && files.length > 0 && (
              <div className="rounded-2xl border border-stone-800 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">You’ll download</h2>
                <ul className="space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-amber-300" />
                      <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[11px] text-stone-200">{fileFormat(f.fileName)}</span>
                      <span className="text-stone-400">{formatFileSize(f.fileSize)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 space-y-10 px-4 md:mt-14 md:max-w-2xl md:px-0">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">About this {isPhysical ? 'item' : product.productType === 'EBOOK' ? 'ebook' : 'product'}</h2>
            <div className="whitespace-pre-line text-[15px] leading-relaxed text-stone-300">{product.description}</div>
          </section>

          {whatYouGet.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">What you get</h2>
              <ul className="space-y-2.5">
                {whatYouGet.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[15px] text-stone-300">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasReviews && (
            <section id="reviews">
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

          <p className="flex items-center justify-center gap-1.5 pb-4 text-xs text-stone-500">
            <Lock className="h-3.5 w-3.5" /> Secure checkout · Mobile Money or card · GH₵
          </p>
        </div>
      </div>
    </div>
  );
}
