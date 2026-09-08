import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/products/product-card';
import { ProductService } from '@/services/product/product.service';
import {
  ShieldCheck,
  Zap,
  Globe2,
  Lock,
  ArrowRight,
  Download,
  CreditCard,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { products: featuredProducts } = await ProductService.getPublishedProducts({
    sort: 'featured',
    page: 1,
    limit: 4,
  });

  return (
    <div className="flex flex-col gap-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]" />
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="default" className="mb-6 px-3.5 py-1 text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              NOV.com • Private Digital Commerce
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-white">
              Own Your Commerce.{' '}
              <span className="gradient-text">Deliver Digital Excellence.</span>
            </h1>
            <p className="mt-6 text-base text-slate-300 sm:text-lg leading-relaxed">
              Welcome to <span className="font-semibold text-white">NOV.com</span>. A high-performance digital commerce platform with multi-provider payments, secure signed downloads,
              robust webhook idempotency, and automated customer library access.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/products">
                <Button size="lg" className="gap-2 shadow-lg shadow-blue-500/20">
                  Explore Products
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="secondary" size="lg" className="gap-2">
                  <Download className="w-4 h-4" />
                  Access Library
                </Button>
              </Link>
            </div>

            {/* Architecture Highlights Pill */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-y border-slate-800/80 py-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Third-Party Marketplace Lock-in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-blue-400" />
                <span>Global Cards & African Mobile Money</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Cryptographically Signed Temporary URLs</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Products Section (Shown if any products exist) */}
      {featuredProducts.length > 0 && (
        <section>
          <Container>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-white">Featured Digital Products</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Hand-crafted templates, instructional guides, and software assets.
                </p>
              </div>
              <Link href="/products">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-400 hover:text-blue-300">
                  View all catalog
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Core Architectural Pillars */}
      <section>
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Engineered for Reliability & Scale</h2>
            <p className="mt-2 text-sm text-slate-400">
              Built on Next.js, PostgreSQL, Prisma, and unified payment adapter architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-950 text-blue-400 border border-blue-800/40">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Payment Abstraction Engine</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Decoupled payment gateway service supporting Flutterwave, Paystack, and extensible adapters with
                  cryptographic webhook signature verification and zero duplicate billing.
                </p>
                <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>State-machine backed order lifecycle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Idempotent webhook processing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Secure Digital Delivery</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Files stay strictly private in Cloudflare R2 / S3 storage. Digital goods are delivered exclusively
                  via short-lived signed URLs with download rate tracking.
                </p>
                <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Entitlement-verified file access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Product versioning & audit logs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">Full Platform Ownership</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct relationship with your customers. No monthly platform cut, total brand control, integrated
                  analytics, discount coupons, and complete exportable data.
                </p>
                <div className="space-y-1.5 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PostgreSQL relational data model</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Role-based access control (RBAC)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}
