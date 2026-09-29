import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/product-card';
import { AnnouncementBanner } from '@/components/marketing/announcement-banner';
import { NewsletterSignup } from '@/components/marketing/newsletter-signup';
import { ProductService } from '@/services/product/product.service';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  Box,
  Truck,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  PackageCheck,
  Check,
  Package,
  Plus,
} from 'lucide-react';
import { ProductKind } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [publishedData, physicalData, digitalData] = await Promise.all([
    ProductService.getPublishedProducts({ page: 1, limit: 6, sort: 'newest' }),
    ProductService.getPublishedProducts({ page: 1, limit: 4, kind: ProductKind.PHYSICAL, sort: 'newest' }),
    ProductService.getPublishedProducts({ page: 1, limit: 4, kind: ProductKind.DIGITAL, sort: 'newest' }),
  ]);

  const featuredProducts = publishedData.products;
  const physicalGoods = physicalData.products;
  const digitalAssets = digitalData.products;

  return (
    <div className="space-y-24 pb-24 text-stone-100 selection:bg-amber-400 selection:text-black bg-[#09090b]">
      <AnnouncementBanner />

      {/* Hero Section — Premium Editorial Commerce */}
      <section className="relative overflow-hidden pt-6 pb-16 lg:py-20 border-b border-stone-800/60">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Editorial Narrative */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900/90 border border-stone-800 text-[11px] font-mono tracking-widest uppercase text-stone-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Single-Maker Atelier • Edition 2026</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-[4.2rem] font-serif font-medium tracking-tight text-white leading-[1.08]">
                Bespoke Physical Objects & <span className="italic font-normal text-stone-300">Digital Craft.</span>
              </h1>

              <p className="max-w-xl text-sm sm:text-base text-stone-400 leading-relaxed mx-auto lg:mx-0 font-sans">
                NOV is the private independent commerce house of bespoke physical goods and refined software assets. Direct from the creator to your hands with verified provenance, insured delivery, and lifetime digital updates.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link href="/products">
                  <Button
                    size="lg"
                    className="gap-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs tracking-wider uppercase px-7 py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
                  >
                    Browse Collection
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>

                <Link href="/products?kind=PHYSICAL">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-medium px-6 py-4 rounded-xl"
                  >
                    <Box className="w-3.5 h-3.5 text-stone-400" />
                    Physical Goods
                  </Button>
                </Link>

                <Link href="/products?kind=DIGITAL">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="gap-2 text-stone-400 hover:text-white text-xs font-medium px-5 py-4"
                  >
                    <Zap className="w-3.5 h-3.5 text-stone-400" />
                    Digital Editions
                  </Button>
                </Link>
              </div>

              {/* Editorial Guarantees */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-stone-900 text-left">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Maker Direct</p>
                  <p className="text-xs font-medium text-stone-200 mt-0.5">Authentic Provenance</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Shipping</p>
                  <p className="text-xs font-medium text-stone-200 mt-0.5">Ghana & Global Express</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Protection</p>
                  <p className="text-xs font-medium text-stone-200 mt-0.5">Paystack & Flutterwave</p>
                </div>
              </div>
            </div>

            {/* Right Hero Product Photograph (Editorial Showcase) */}
            <div className="lg:col-span-6 relative">
              <div className="relative aspect-[4/5] w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-stone-800/80 bg-stone-900 shadow-2xl group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-product.jpg"
                  alt="Titanium Chrono Edition 01"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

                {/* Floating Editorial Label */}
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-stone-950/90 backdrop-blur-md border border-stone-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-medium">
                      Featured Piece
                    </span>
                    <h3 className="text-xs font-medium text-stone-100">Titanium Chrono Edition 01</h3>
                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">$385.00 USD • In Stock</p>
                  </div>
                  <Link href="/products/titanium-chrono-edition-01">
                    <Button size="sm" className="bg-stone-100 hover:bg-white text-stone-900 text-xs px-3.5 py-1.5 rounded-lg font-medium">
                      Inspect
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Curated Categories Strip */}
      <section>
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Curated Disciplines</span>
              <h2 className="text-2xl font-serif font-medium tracking-tight text-white mt-1">Categories</h2>
            </div>
            <Link href="/categories" className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1">
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { name: 'Luxury Accessories', slug: 'accessories', type: 'Physical Goods', count: 'Edition Items' },
              { name: 'Fashion & Apparel', slug: 'fashion', type: 'Physical Goods', count: 'Tailored Garments' },
              { name: 'Developer Tools', slug: 'software', type: 'Digital Delivery', count: 'Source Code' },
              { name: 'Footwear & Sneakers', slug: 'footwear', type: 'Physical Goods', count: 'Limited Drops' },
              { name: 'Electronics & Audio', slug: 'electronics', type: 'Physical Goods', count: 'Acoustic Gear' },
              { name: '3D & Graphics Assets', slug: 'graphics', type: 'Digital Delivery', count: 'Spatial Assets' },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group p-5 rounded-xl bg-stone-950 border border-stone-800/70 hover:border-stone-700 transition-all hover:-translate-y-0.5 flex flex-col justify-between h-36"
              >
                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">{cat.type}</span>
                <div>
                  <h3 className="text-xs font-semibold text-stone-200 group-hover:text-amber-200 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-1">{cat.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Pieces */}
      <section>
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Signature Works</span>
              <h2 className="text-2xl font-serif font-medium tracking-tight text-white mt-1">Featured Selections</h2>
            </div>
            <Link href="/products" className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1">
              View Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-800/80 bg-stone-950/60 p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 border border-stone-800 text-stone-300">
                <Package className="w-6 h-6 text-amber-400/80" />
              </div>
              <h3 className="text-lg font-serif font-medium text-white">New Collection in Preparation</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                The atelier is currently preparing and inspecting our next small-batch release of physical craft pieces and digital software tools.
              </p>
              <div className="pt-2">
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-stone-200 text-stone-950 hover:bg-white transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Admin: Add First Product</span>
                </Link>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Brand Craftsmanship / Independent Atelier Statement */}
      <section className="bg-stone-950 border-y border-stone-900 py-16">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-medium">
                The Single-Owner Philosophy
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-white tracking-tight leading-snug">
                One Vision. Crafted In-House. <br />
                Direct to Collector.
              </h2>
              <p className="text-sm text-stone-400 leading-relaxed max-w-xl">
                Unlike mass-market platforms with thousands of anonymous resellers, every item on NOV is designed, curated, and dispatched directly by the store owner. Physical goods are inspected by hand in small batches; digital tools receive direct lifetime engineering revisions.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-300">Verified authenticity on all physical goods</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-300">Cryptographically signed digital download links</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-300">Local Ghana Mobile Money & international cards</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-stone-300">Insured express delivery with live tracking</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 shadow-xl group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/product-2.jpg"
                  alt="Artisanal craftsmanship"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Tangible Physical Goods */}
      {physicalGoods.length > 0 && (
        <section>
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Shipped Worldwide & Domestic</span>
                <h2 className="text-2xl font-serif font-medium tracking-tight text-white mt-1">Physical Goods</h2>
              </div>
              <Link href="/products?kind=PHYSICAL" className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1">
                All Physical <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {physicalGoods.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Instant Digital Assets */}
      {digitalAssets.length > 0 && (
        <section>
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Instant Download Entitlements</span>
                <h2 className="text-2xl font-serif font-medium tracking-tight text-white mt-1">Digital Deliverables</h2>
              </div>
              <Link href="/products?kind=DIGITAL" className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1">
                All Digital <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {digitalAssets.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Newsletter / Exclusive Releases */}
      <NewsletterSignup />
    </div>
  );
}
