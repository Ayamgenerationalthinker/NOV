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
} from 'lucide-react';

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

  // Load reviews and user review eligibility in parallel
  const session = await SessionService.getCurrentSession();
  const [reviewsData, reviewStatus] = await Promise.all([
    ReviewService.getProductReviews(product.id, { page: 1, limit: 10 }).catch(() => ({
      reviews: [],
      pagination: { page: 1, limit: 10, totalPages: 1, totalReviews: 0 },
      metrics: {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        distributionPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    })),
    ReviewService.checkCustomerReviewStatus(product.id, session?.userId).catch(() => ({
      canReview: false,
      isVerifiedPurchase: false,
      existingReview: null,
    })),
  ]);

  const hasDiscount =
    product.discountPrice !== null &&
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;

  const discountPercentage = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  return (
    <div className="py-12 md:py-16">
      <Container>
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-white transition-colors">
            Products
          </Link>
          <span>/</span>
          <span className="text-slate-200 line-clamp-1">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Visuals & Detailed Overview */}
          <div className="lg:col-span-7 space-y-10">
            {/* Cover Visual */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center shadow-2xl">
              {product.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.coverImage}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                  <div className="rounded-2xl bg-slate-900 p-6 border border-slate-800 mb-3 text-blue-400">
                    <Download className="w-10 h-10" />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    {product.productType}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Product Overview</h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>

            {/* What's Included */}
            {product.whatsIncluded && product.whatsIncluded.length > 0 && (
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  What&apos;s Included
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.whatsIncluded.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white">Key Features</h3>
                <div className="space-y-2.5">
                  {product.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Included Digital Files List */}
            {product.files && product.files.length > 0 && (
              <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Downloadable Files ({product.files.length})
                </h3>
                <div className="space-y-2">
                  {product.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <span className="font-medium text-white">{file.fileName}</span>
                          <span className="ml-2 text-[11px] text-slate-500 uppercase">{file.fileType}</span>
                        </div>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Checkout Card & Licensing */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="sticky top-24 border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-[10px]">
                      {product.productType}
                    </Badge>
                    {product.categories.map(({ category }) => (
                      <Badge key={category.slug} variant="secondary" className="text-[10px]">
                        {category.name}
                      </Badge>
                    ))}
                  </div>

                  <h1 className="text-2xl font-bold text-white">{product.title}</h1>

                  {/* Rating Stars Header Preview */}
                  <div className="mt-2 flex items-center gap-2">
                    <a href="#reviews" className="flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= Math.round(reviewsData.metrics.averageRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-white">
                        {reviewsData.metrics.averageRating > 0
                          ? reviewsData.metrics.averageRating.toFixed(1)
                          : 'New'}
                      </span>
                      <span className="text-slate-400">
                        ({reviewsData.metrics.totalReviews} review{reviewsData.metrics.totalReviews === 1 ? '' : 's'})
                      </span>
                    </a>
                  </div>

                  {product.shortDescription && (
                    <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                      {product.shortDescription}
                    </p>
                  )}
                </div>

                {/* Price Display */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-white">
                      {formatCurrency(hasDiscount ? product.discountPrice! : product.price, product.currency)}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-slate-500 line-through">
                        {formatCurrency(product.price, product.currency)}
                      </span>
                    )}
                    {hasDiscount && (
                      <Badge variant="secondary" className="ml-auto bg-emerald-950 text-emerald-400 border-emerald-800">
                        Save {discountPercentage}%
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    One-time payment • Lifetime personal license • Free future updates
                  </p>
                </div>

                {/* Purchase Actions */}
                <ProductBuyActions
                  product={{
                    id: product.id,
                    title: product.title,
                    slug: product.slug,
                    price: product.price,
                    discountPrice: product.discountPrice,
                    coverImage: product.coverImage,
                    productType: product.productType,
                  }}
                />

                {/* Guarantee Highlights */}
                <div className="border-t border-slate-800/80 pt-6 space-y-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Instant download access immediately after payment</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Secure global cards & African Mobile Money supported</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Direct creator support & update guarantee</span>
                  </div>
                </div>

                {/* License & Refund Information */}
                {(product.licenseInfo || product.refundInfo) && (
                  <div className="border-t border-slate-800/80 pt-4 space-y-2 text-[11px] text-slate-500">
                    {product.licenseInfo && (
                      <p>
                        <strong className="text-slate-400">License:</strong> {product.licenseInfo}
                      </p>
                    )}
                    {product.refundInfo && (
                      <p>
                        <strong className="text-slate-400">Refund Policy:</strong> {product.refundInfo}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <ProductReviews
          productId={product.id}
          productTitle={product.title}
          initialReviews={reviewsData.reviews}
          initialMetrics={reviewsData.metrics}
          currentUser={session ? { id: session.userId, email: session.email } : null}
          isVerifiedBuyer={reviewStatus.isVerifiedPurchase}
          existingReview={reviewStatus.existingReview}
        />
      </Container>
    </div>
  );
}
