import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Download, FileText, LifeBuoy, Star, Truck } from 'lucide-react';
import { ProductService } from '@/services/product/product.service';
import { ReviewService } from '@/services/review/review.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { ProductBuyActions } from '@/components/products/product-buy-actions';
import { ProductMediaGallery } from '@/components/products/product-media-gallery';
import { GuideCard } from '@/components/products/guide-card';
import { formatCurrency, formatFileSize } from '@/lib/utils';
import { buildProductMetadata } from '@/lib/product-metadata';
import { availableStock, buildCheckoutUrl, productDisplayPrice, resolveBuyState } from '@/lib/product-purchase';
import { env } from '@/lib/env';
import { GUIDE_COPY } from '@/content/guides';
import { productGoals } from '@/lib/goals';
import { toShopProducts } from '@/lib/shop-product';
import { productTypeLabel } from '@/lib/product-types';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { pageWidth, primaryButton, SectionHeading } from '@/components/home/primitives';
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

  const [reviews, catalog] = await Promise.all([
    ReviewService.getProductReviews(product.id, { limit: 5 }),
    // Related guides are a nice extra: a failed lookup must never take the buying page down.
    ProductService.getPublishedProducts({ page: 1, limit: 48, sort: 'newest' }).catch(() => ({ products: [] })),
  ]);
  const hasReviews = reviews.metrics.totalReviews > 0;

  const whatYouGet = product.whatsIncluded.length > 0 ? product.whatsIncluded : product.features;
  const files = product.files;
  const category = isPhysical ? null : product.productType === 'EBOOK' ? 'PDF guide' : productTypeLabel(product.productType);
  const totalFileSize = files.reduce((sum, f) => sum + Number(f.fileSize), 0);
  const formats = Array.from(new Set(files.map((f) => fileFormat(f.fileName))));
  const copy = GUIDE_COPY[product.slug];
  const summary = copy?.outcome ?? product.shortDescription?.trim();
  const email = env.NEXT_PUBLIC_SUPPORT_EMAIL;

  // Guides that share a goal with this one first, so the suggestions are never random.
  const goals = productGoals(product);
  const others = toShopProducts(catalog.products).filter((p) => p.id !== product.id);
  const related = [...others.filter((p) => p.goals.some((g) => goals.includes(g))), ...others.filter((p) => !p.goals.some((g) => goals.includes(g)))].slice(0, 4);

  const checkoutHref = buildCheckoutUrl({ slug: product.slug, variantId: buyState.selectedId, quantity: buyState.quantity, coupon: buyState.coupon });
  const canBuyBelow = !isPhysical;

  return (
    <>
      <Header />
      <div className="flex-1 bg-paper text-ink">
        <div className={`${pageWidth} pb-10 pt-5 lg:pb-16 lg:pt-8`}>
          <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
            <Link href="/products" className="underline underline-offset-4 hover:text-ink">Shop</Link>
            <span aria-hidden> / </span>
            <span aria-current="page" className="text-ink">{product.title}</span>
          </nav>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-14">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ProductMediaGallery
                coverImage={product.coverImage}
                galleryImages={isPhysical ? product.galleryImages : []}
                model3dUrl={product.model3dUrl}
                model3dPoster={product.model3dPoster}
                productTitle={product.title}
                compact={!isPhysical}
              />
            </div>

            <div className="min-w-0 space-y-5">
              <div>
                {category && <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-bold tracking-wide text-brand-hover">{category}</span>}
                <h1 className="mt-3 break-words font-heading text-[38px] font-extrabold tracking-[-0.02em] leading-[1.1] text-ink lg:text-[52px] lg:leading-[1.08]">{product.title}</h1>
                {summary && <p className="mt-3 text-base leading-relaxed text-ink-soft lg:text-[19px]">{summary}</p>}
                {copy?.audience && <p className="mt-2 text-base text-ink">{copy.audience}.</p>}
                {hasReviews && (
                  <a href="#reviews" className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                    <span className="flex text-brand" aria-hidden>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`h-4 w-4 ${n <= Math.round(reviews.metrics.averageRating) ? 'fill-brand' : 'text-line-strong'}`} />
                      ))}
                    </span>
                    <span className="text-ink">
                      {reviews.metrics.averageRating.toFixed(1)} from {reviews.metrics.totalReviews} review{reviews.metrics.totalReviews === 1 ? '' : 's'}
                    </span>
                  </a>
                )}
              </div>

              <ProductBuyActions
                slug={product.slug}
                title={product.title}
                currency={product.currency}
                isPhysical={isPhysical}
                basePrice={displayPrice}
                baseAvailable={isPhysical ? (defaultVariant ? availableStock(defaultVariant) : 0) : null}
                initial={buyState}
              />

              {/* Reassurance beside the decision. Every line here describes how checkout really works. */}
              <ul className="space-y-3 rounded-[14px] border border-line bg-card p-4 text-sm leading-normal text-ink-soft">
                {isPhysical ? (
                  <li className="flex gap-3">
                    <Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                    <span><strong className="block font-semibold text-ink">Delivered to your address</strong>We’ll call or WhatsApp you on the number you give at checkout.</span>
                  </li>
                ) : (
                  <li className="flex gap-3">
                    <Download className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                    <span><strong className="block font-semibold text-ink">Download after payment</strong>Your download appears once payment is confirmed, and we email you a link.</span>
                  </li>
                )}
                <li className="flex gap-3">
                  <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span>
                    <strong className="block font-semibold text-ink">Help if something goes wrong</strong>
                    Email <a href={`mailto:${email}`} className="break-all font-medium text-brand-hover underline underline-offset-4">{email}</a> with your order number. <Link href="/#faq" className="font-medium text-brand-hover underline underline-offset-4">Refunds and delivery</Link>
                  </span>
                </li>
              </ul>

              {!isPhysical && (
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line text-sm">
                  <div className="bg-card p-3.5">
                    <dt className="text-ink-soft">Format</dt>
                    <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-ink">
                      <FileText className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                      {formats.length > 0 ? formats.join(', ') : category}
                    </dd>
                  </div>
                  <div className="bg-card p-3.5">
                    <dt className="text-ink-soft">{files.length > 1 ? `${files.length} files` : 'Size'}</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-ink">{totalFileSize > 0 ? formatFileSize(totalFileSize) : 'Listed at download'}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>

        {!isPhysical && product.galleryImages.length > 0 && (
          <section aria-labelledby="inside-title" className="bg-band py-10 lg:py-14">
            <div className={pageWidth}>
              <SectionHeading id="inside-title" title="Look inside" />
              <ul className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
                {product.galleryImages.map((image, i) => (
                  <li key={image} className="w-60 shrink-0 snap-start lg:w-72">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={`Page from ${product.title}, sample ${i + 1}`} loading="lazy" width={288} height={384} className="h-auto w-full rounded-[10px] border border-line bg-card" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className={`${pageWidth} grid gap-10 py-10 lg:grid-cols-2 lg:gap-16 lg:py-14`}>
          {whatYouGet.length > 0 && (
            <section aria-labelledby="get-title">
              <SectionHeading id="get-title" title="What you get" />
              <div className="mt-4">
                <ExpandableList items={whatYouGet} />
              </div>
            </section>
          )}
          <section aria-labelledby="about-title">
            <SectionHeading id="about-title" title={`About this ${isPhysical ? 'item' : 'guide'}`} />
            <div className="mt-4">
              <ExpandableText text={product.description} />
            </div>
            {!isPhysical && (
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                This guide gives you information and steps to follow. Results depend on your effort and your situation.
              </p>
            )}
          </section>
        </div>

        {hasReviews && (
          <section id="reviews" aria-labelledby="reviews-title" className="bg-band py-10 lg:py-14">
            <div className={pageWidth}>
              <SectionHeading id="reviews-title" title="What buyers say" />
              <ul className="mt-5 grid gap-4 lg:grid-cols-3">
                {reviews.reviews.map((review) => (
                  <li key={review.id} className="rounded-[14px] border border-line bg-card p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="flex text-brand" role="img" aria-label={`${review.rating} out of 5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`h-4 w-4 ${n <= review.rating ? 'fill-brand' : 'text-line-strong'}`} aria-hidden />
                        ))}
                      </span>
                      <span className="text-sm text-ink-soft">{review.customerName?.split(' ')[0] || 'Buyer'}</span>
                      {review.isVerifiedPurchase && <span className="text-sm font-semibold text-ok">Verified buyer</span>}
                    </div>
                    {review.title && <p className="font-semibold text-ink">{review.title}</p>}
                    <p className="text-sm leading-relaxed text-ink-soft">{review.comment}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="py-10 lg:py-14">
            <div className={pageWidth}>
              <SectionHeading id="related-title" title="Related guides" />
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {related.map((item) => (
                  <li key={item.id}>
                    <GuideCard product={item} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {canBuyBelow && (
          <section aria-label={`Buy ${product.title}`} className="bg-brand-soft">
            <div className={`${pageWidth} flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between`}>
              <div>
                <p className="text-[17px] font-bold text-ink">{product.title}</p>
                <p className="text-lg font-bold tabular-nums text-ink">{formatCurrency(displayPrice.price, product.currency)}</p>
              </div>
              <Link href={checkoutHref} className={primaryButton}>Buy now</Link>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
