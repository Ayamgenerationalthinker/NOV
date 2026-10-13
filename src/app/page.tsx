import type { Metadata } from 'next';
import { ProductService } from '@/services/product/product.service';
import { env } from '@/lib/env';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { availableStock } from '@/lib/product-purchase';
import { productGoals } from '@/lib/goals';
import { Hero } from '@/components/home/hero';
import { HomeMotion } from '@/components/home/home-motion';
import { WhySection } from '@/components/home/why-section';
import { GoalProvider } from '@/components/home/goal-context';
import { GoalSelector } from '@/components/home/goal-selector';
import { ShopSection, type ShopProduct } from '@/components/home/shop-section';
import { StepsSection } from '@/components/home/steps-section';
import { StoriesSection } from '@/components/home/stories-section';
import { FaqSection } from '@/components/home/faq-section';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Practical ebooks and downloadable PDF guides for starting a business, earning online, saving, freelancing and digital skills. Pay in GH₵ with Mobile Money or card. Instant download, no account needed.';

export const metadata: Metadata = {
  title: { absolute: `${env.NEXT_PUBLIC_APP_NAME} | Ebooks and downloads to help you do more` },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: env.NEXT_PUBLIC_APP_NAME,
    title: `${env.NEXT_PUBLIC_APP_NAME} | Ebooks and downloads to help you do more`,
    description: DESCRIPTION,
  },
};

const TYPE_LABELS: Record<string, string> = {
  EBOOK: 'Ebook',
  COURSE: 'Course',
  TEMPLATE: 'Template',
  AUDIO: 'Audio',
  VIDEO: 'Video',
  SOFTWARE: 'Software',
  GRAPHICS: 'Graphics',
};

export default async function HomePage() {
  const [{ products }, session] = await Promise.all([
    ProductService.getPublishedProducts({ page: 1, limit: 48, sort: 'newest' }),
    SessionService.getCurrentSession(),
  ]);
  const isOwner = Boolean(session && RBACService.isAdmin(session.role));
  const hasDigital = products.some((p) => p.productKind === 'DIGITAL');
  const hasPhysical = products.some((p) => p.productKind === 'PHYSICAL');

  // Only what the grid needs crosses to the browser.
  const shopProducts: ShopProduct[] = products.map((product) => {
    const onSale = product.discountPrice != null && product.discountPrice < product.price;
    const isPhysical = product.productKind === 'PHYSICAL';
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      summary: product.shortDescription,
      coverImage: product.coverImage,
      price: onSale ? product.discountPrice! : product.price,
      wasPrice: onSale ? product.price : null,
      currency: product.currency,
      label: isPhysical ? 'Delivered' : (TYPE_LABELS[product.productType] ?? 'Download'),
      isPhysical,
      soldOut: isPhysical && product.variants.reduce((sum, v) => sum + availableStock(v), 0) === 0,
      goals: productGoals(product),
    };
  });

  const goalCounts: Record<string, number> = {};
  for (const product of shopProducts) {
    for (const goal of product.goals) goalCounts[goal] = (goalCounts[goal] ?? 0) + 1;
  }

  const headline =
    hasDigital && hasPhysical
      ? 'Ebooks, downloads and goods, made to help you do more.'
      : hasPhysical
        ? 'Quality goods, delivered to your door.'
        : 'Ebooks and downloads to help you do more.';

  return (
    <div className="bg-surface font-display text-fg">
      <HomeMotion />
      <Hero headline={headline} subline="Pay in seconds with Mobile Money or card. No account needed." />
      <WhySection />
      <GoalProvider>
        <GoalSelector counts={goalCounts} total={shopProducts.length} />
        <ShopSection products={shopProducts} isOwner={isOwner} />
      </GoalProvider>
      <StepsSection />
      <StoriesSection supportEmail={env.NEXT_PUBLIC_SUPPORT_EMAIL} isOwner={isOwner} />
      <FaqSection supportEmail={env.NEXT_PUBLIC_SUPPORT_EMAIL} />
    </div>
  );
}
