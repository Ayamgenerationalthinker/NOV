import Link from 'next/link';
import { ArrowRight, Download, Smartphone, Truck } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { ProductCard } from '@/components/products/product-card';
import { ProductService } from '@/services/product/product.service';
import { env } from '@/lib/env';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [{ products }, session] = await Promise.all([
    ProductService.getPublishedProducts({ page: 1, limit: 48, sort: 'newest' }),
    SessionService.getCurrentSession(),
  ]);
  const isOwner = Boolean(session && RBACService.isAdmin(session.role));
  const hasDigital = products.some((p) => p.productKind === 'DIGITAL');
  const hasPhysical = products.some((p) => p.productKind === 'PHYSICAL');

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="border-b border-stone-800/70 bg-gradient-to-b from-stone-900/60 to-stone-950">
        <Container className="py-12 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">{env.NEXT_PUBLIC_APP_NAME}</p>
            <h1 className="mt-3 font-serif text-4xl leading-[1.1] text-white sm:text-5xl">
              {hasDigital && hasPhysical
                ? 'Ebooks, downloads and goods, made to help you do more.'
                : hasPhysical
                  ? 'Quality goods, delivered to your door.'
                  : 'Ebooks and downloads to help you do more.'}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-stone-400">
              Pay in seconds with Mobile Money or card. No account needed.
            </p>
            {products.length > 0 && (
              <Link
                href="#shop"
                className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-amber-300 px-6 font-semibold text-stone-950 hover:bg-amber-200"
              >
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </Container>
      </section>

      {/* Products */}
      <section id="shop" className="scroll-mt-16">
        <Container className="py-10 sm:py-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Shop</h2>
            {products.length > 0 && (
              <span className="text-sm text-stone-500">
                {products.length} product{products.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-800 px-6 py-16 text-center text-stone-400">
              {isOwner ? (
                <>
                  <p>You haven’t published any products yet.</p>
                  <Link
                    href="/admin/products/new"
                    className="mt-4 inline-flex h-11 items-center rounded-xl bg-amber-300 px-5 font-semibold text-stone-950 hover:bg-amber-200"
                  >
                    Add your first product
                  </Link>
                </>
              ) : (
                'New products are coming soon.'
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* How buying works */}
      {products.length > 0 && (
        <section>
          <Container>
            <div className="grid gap-3 rounded-2xl border border-stone-800/70 bg-stone-900/40 p-5 sm:grid-cols-3 sm:p-6">
              {[
                { icon: Smartphone, title: 'Pay with MoMo or card', text: 'Secure checkout in GH₵. No account needed.' },
                ...(hasDigital ? [{ icon: Download, title: 'Instant download', text: 'Get your files right after paying, plus a link by email.' }] : []),
                ...(hasPhysical ? [{ icon: Truck, title: 'Delivered to you', text: 'We call or WhatsApp you to arrange delivery.' }] : []),
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="rounded-xl bg-stone-800/80 p-2.5 text-amber-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-100">{title}</p>
                    <p className="text-sm text-stone-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}
    </div>
  );
}
