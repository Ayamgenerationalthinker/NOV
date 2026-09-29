import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductService } from '@/services/product/product.service';
import { ReviewService } from '@/services/review/review.service';
import { SessionService } from '@/services/auth/session.service';
import { ProductBuyActions } from '@/components/products/product-buy-actions';
import { ProductMediaGallery } from '@/components/products/product-media-gallery';
import { ProductReviews } from '@/components/reviews/product-reviews';
import { formatCurrency, formatFileSize } from '@/lib/utils';
import {
  CheckCircle,
  Zap,
  Download,
  FileText,
  Lock,
  RotateCcw,
  Sparkles,
  Star,
  Truck,
  ShieldCheck,
  Store,
  Box,
} from 'lucide-react';
import { ProductKind } from '@prisma/client';

interface ProductDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await ProductService.getProductBySlug(slug);

  if (!product || !product.isPublished) {
    return {
      title: 'Product Not Found | NOV.com',
    };
  }

  return {
    title: `${product.title} | NOV.com`,
    description: product.shortDescription || product.description.slice(0, 160),
    openGraph: {
      title: product.title,
      description: product.shortDescription || product.description.slice(0, 160),
      images: product.coverImage ? [{ url: product.coverImage }] : [],
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { slug } = await params;
  const product = await ProductService.getProductBySlug(slug);

  if (!product || !product.isPublished) {
    notFound();
  }

  const session = await SessionService.getCurrentSession();
  const [reviewsData, userEligibility] = await Promise.all([
    ReviewService.getProductReviews(product.id),
    ReviewService.checkCustomerReviewStatus(product.id, session?.userId),
  ]);

  const hasDiscount =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;

  const isPhysical = product.productKind === ProductKind.PHYSICAL;

  return (
    <div className="py-10 space-y-16 text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <Container>
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-white transition-colors">
            Products
          </Link>
          <span>/</span>
          <Link
            href={`/products?kind=${product.productKind}`}
            className="hover:text-white transition-colors uppercase"
          >
            {isPhysical ? 'Physical Goods' : 'Digital Assets'}
          </Link>
          <span>/</span>
          <span className="text-zinc-300 font-medium truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Media & 3D Interactive Viewer */}
          <div className="lg:col-span-7">
            <ProductMediaGallery
              coverImage={product.coverImage}
              galleryImages={product.galleryImages}
              model3dUrl={product.model3dUrl}
              model3dPoster={product.model3dPoster}
              productTitle={product.title}
            />
          </div>

          {/* Right Column: Details, Variants, Price, & Buy Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Header / Brand */}
            <div>
              {product.brand && (
                <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold mb-2">
                  {product.brand}
                </p>
              )}
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                {product.title}
              </h1>

              {/* Verified Rating Snapshot */}
              {reviewsData.metrics.totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(reviewsData.metrics.averageRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-semibold text-white">
                    {reviewsData.metrics.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    ({reviewsData.metrics.totalReviews} reviews)
                  </span>
                </div>
              )}
            </div>

            {/* Price Header */}
            <div className="flex items-baseline gap-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80">
              <span className="text-3xl font-bold font-mono text-white">
                {formatCurrency(
                  hasDiscount ? product.discountPrice! : product.price,
                  product.currency
                )}
              </span>
              {hasDiscount && (
                <span className="text-sm font-mono text-zinc-500 line-through">
                  {formatCurrency(product.price, product.currency)}
                </span>
              )}
              <span className="text-[11px] font-mono text-zinc-400 ml-auto uppercase">
                {product.currency}
              </span>
            </div>

            {/* Short Tagline */}
            {product.shortDescription && (
              <p className="text-sm text-zinc-300 leading-relaxed font-normal">
                {product.shortDescription}
              </p>
            )}

            {/* Buy Actions Component */}
            <ProductBuyActions
              product={{
                id: product.id,
                title: product.title,
                slug: product.slug,
                price: product.price,
                discountPrice: product.discountPrice,
                currency: product.currency,
                coverImage: product.coverImage,
                productType: product.productType,
                productKind: product.productKind,
                variants: product.variants,
              }}
            />

            {/* Shipping & Delivery Guarantee Card */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3 text-xs text-zinc-400">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-zinc-900 text-emerald-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {isPhysical ? 'Nationwide & Global Dispatch' : 'Zero-Wait Instant Download'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {isPhysical
                      ? 'Shipped with insured tracking reference in 24–48h'
                      : 'Immediate signed cryptographic download links'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-zinc-900">
                <div className="p-2 rounded-xl bg-zinc-900 text-emerald-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {product.refundInfo || '14-Day Buyer Guarantee'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {isPhysical ? 'Easy returns on original condition items' : 'Satisfaction guaranteed'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Product Specifications & Reviews */}
        <div className="mt-20 pt-12 border-t border-zinc-900 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">About this Product</h2>
              <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {/* Key Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-white mb-3">Key Highlights & Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.features.map((feature: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-300"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Reviews Section */}
            <ProductReviews
              productId={product.id}
              productTitle={product.title}
              initialReviews={reviewsData.reviews}
              initialMetrics={reviewsData.metrics}
              currentUser={session ? { id: session.userId, email: session.email, name: session.email.split('@')[0] } : null}
              isVerifiedBuyer={userEligibility.isVerifiedPurchase}
              existingReview={userEligibility.existingReview}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
