import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/product-card';
import { Hero3DScene } from '@/components/3d/hero-3d-scene';
import { Product3DViewer } from '@/components/3d/product-3d-viewer';
import { AnnouncementBanner } from '@/components/marketing/announcement-banner';
import { NewsletterSignup } from '@/components/marketing/newsletter-signup';
import { prisma } from '@/lib/prisma';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe2,
  Box,
  Truck,
  RotateCcw,
  Compass,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { ProductKind } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let featuredProducts: any[] = [];
  let physicalGoods: any[] = [];
  let digitalAssets: any[] = [];
  let categories: any[] = [];

  try {
    const [featured, physical, digital, cats] = await Promise.all([
      prisma.product.findMany({
        where: { isPublished: true, isFeatured: true },
        include: {
          categories: { include: { category: true } },
          variants: true,
        },
        take: 6,
      }),
      prisma.product.findMany({
        where: { isPublished: true, productKind: ProductKind.PHYSICAL },
        include: {
          categories: { include: { category: true } },
          variants: true,
        },
        take: 4,
      }),
      prisma.product.findMany({
        where: { isPublished: true, productKind: ProductKind.DIGITAL },
        include: {
          categories: { include: { category: true } },
          variants: true,
        },
        take: 4,
      }),
      prisma.category.findMany({
        take: 6,
      }),
    ]);

    featuredProducts = featured.map((p) => ({
      ...p,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    }));

    physicalGoods = physical.map((p) => ({
      ...p,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    }));

    digitalAssets = digital.map((p) => ({
      ...p,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
    }));

    categories = cats;
  } catch (err) {
    console.error('Failed to load home page products:', err);
  }

  const spotlight3dProduct = featuredProducts.find((p) => p.model3dUrl) || featuredProducts[0];

  return (
    <div className="space-y-24 pb-20 text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <AnnouncementBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:py-24 border-b border-zinc-900">
        {/* Subtle Ambient Gradient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Headline */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-emerald-400 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span className="font-mono tracking-wide uppercase">Next-Gen Hybrid Commerce</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05]">
                Luxury Crafts & <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-200 bg-clip-text text-transparent">
                  Digital Mastery.
                </span>
              </h1>

              <p className="max-w-xl text-sm sm:text-base text-zinc-400 leading-relaxed mx-auto lg:mx-0">
                Discover exceptional physical fashion, curated electronics, and high-performance digital assets in one unified, 3D-interactive storefront.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link href="/products">
                  <Button
                    size="lg"
                    className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider text-xs px-8 py-4 rounded-2xl shadow-xl shadow-emerald-950/50"
                  >
                    Explore Catalog
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link href="/products?kind=PHYSICAL">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold px-6 py-4 rounded-2xl"
                  >
                    <Box className="w-4 h-4 text-emerald-400" />
                    Physical Goods
                  </Button>
                </Link>
              </div>

              {/* Value Props Bar */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-zinc-900 text-left">
                <div>
                  <p className="text-xs font-mono uppercase text-zinc-500">Multi-Gateway</p>
                  <p className="text-sm font-semibold text-white mt-0.5">Cards & Mobile Money</p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase text-zinc-500">Delivery</p>
                  <p className="text-sm font-semibold text-white mt-0.5">Tracked & Insured</p>
                </div>
                <div>
                  <p className="text-xs font-mono uppercase text-zinc-500">Security</p>
                  <p className="text-sm font-semibold text-white mt-0.5">Zero-Trust Verified</p>
                </div>
              </div>
            </div>

            {/* Right Interactive 3D Canvas */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="w-full max-w-lg aspect-square rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-2 shadow-2xl backdrop-blur-xl relative group">
                <Hero3DScene />
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Interactive 3D Stage
                    </span>
                    <p className="text-xs font-medium text-white">Spatial Object Rendering</p>
                  </div>
                  <Link href="/products">
                    <span className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1">
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Category Tiles */}
      <section>
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Curated Collections</h2>
              <p className="text-xs text-zinc-400 mt-1">Explore by physical and digital craft categories</p>
            </div>
            <Link href="/categories" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              All Categories <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Fashion & Apparel', icon: '👔', slug: 'fashion', count: 'Physical' },
              { name: 'Luxury Footwear', icon: '👟', slug: 'footwear', count: 'Physical' },
              { name: 'Electronics', icon: '⚡', slug: 'electronics', count: 'Physical' },
              { name: 'Accessories', icon: '⌚', slug: 'accessories', count: 'Physical' },
              { name: 'Software & Code', icon: '💻', slug: 'software', count: 'Digital' },
              { name: '3D & Graphics', icon: '💎', slug: 'graphics', count: 'Digital' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group p-5 rounded-3xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col items-center text-center"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[10px] font-mono text-zinc-500 uppercase mt-1">
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Showcase */}
      {featuredProducts.length > 0 && (
        <section>
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Featured Selections</h2>
                <p className="text-xs text-zinc-400 mt-1">Signature physical merchandise and prime digital assets</p>
              </div>
              <Link href="/products" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* 3D Interactive Spotlight Banner */}
      {spotlight3dProduct && (
        <section className="bg-zinc-950 border-y border-zinc-900 py-16">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                  <Box className="w-3.5 h-3.5" />
                  <span>360° Real-time 3D Inspection</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Inspect Every Angle Before Ordering
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Interactive real-time 3D models allow you to rotate, zoom, and examine product dimensions, surface finishes, and craftsmanship right in your browser.
                </p>
                <Link href={`/products/${spotlight3dProduct.slug}`}>
                  <Button size="lg" className="bg-white text-black hover:bg-zinc-200 font-semibold text-xs px-6 py-3.5 rounded-xl">
                    Inspect Product in 3D
                  </Button>
                </Link>
              </div>

              <div className="lg:col-span-6 max-w-md mx-auto w-full">
                <Product3DViewer
                  modelUrl={spotlight3dProduct.model3dUrl}
                  posterImage={spotlight3dProduct.coverImage}
                  productTitle={spotlight3dProduct.title}
                />
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Physical Goods Row */}
      {physicalGoods.length > 0 && (
        <section>
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Truck className="w-6 h-6 text-emerald-400" />
                  Tangible Physical Goods
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Apparel, footwear, electronics with nationwide courier dispatch</p>
              </div>
              <Link href="/products?kind=PHYSICAL" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Browse Physical <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {physicalGoods.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Digital Assets Row */}
      {digitalAssets.length > 0 && (
        <section>
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-emerald-400" />
                  Instant Digital Deliverables
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Software, templates, and digital media with instant library access</p>
              </div>
              <Link href="/products?kind=DIGITAL" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                Browse Digital <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {digitalAssets.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Newsletter Signup */}
      <NewsletterSignup />
    </div>
  );
}
