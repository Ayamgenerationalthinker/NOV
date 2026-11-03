import type { Metadata } from 'next';
import { ProductService } from '@/services/product/product.service';
import { env } from '@/lib/env';
import { SessionService } from '@/services/auth/session.service';
import { RBACService } from '@/services/auth/rbac.service';
import { toShopProducts } from '@/lib/shop-product';
import { Hero } from '@/components/home/hero';
import { GoalTiles } from '@/components/home/goal-tiles';
import { ShopSection } from '@/components/home/shop-section';
import { StepsSection } from '@/components/home/steps-section';
import { StoriesSection } from '@/components/home/stories-section';
import { TestimonialService } from '@/services/testimonial/testimonial.service';
import { FaqSection } from '@/components/home/faq-section';

export const dynamic = 'force-dynamic';

const TITLE = `${env.NEXT_PUBLIC_APP_NAME} | Practical guides for your money, work and next step`;
const DESCRIPTION =
  'Practical ebooks and downloadable PDF guides for starting a business, earning online, saving, freelancing and digital skills. Pay in GH₵ with Mobile Money or card. Instant download, no account needed.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: env.NEXT_PUBLIC_APP_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function HomePage() {
  const [{ products }, session, stories] = await Promise.all([
    ProductService.getPublishedProducts({ page: 1, limit: 48, sort: 'newest' }),
    SessionService.getCurrentSession(),
    TestimonialService.getPublished(),
  ]);
  const isOwner = Boolean(session && RBACService.isAdmin(session.role));
  const shopProducts = toShopProducts(products);

  const goalCounts: Record<string, number> = {};
  for (const product of shopProducts) {
    for (const goal of product.goals) goalCounts[goal] = (goalCounts[goal] ?? 0) + 1;
  }

  return (
    <div>
      <Hero featured={shopProducts.slice(0, 3)} />
      <GoalTiles counts={goalCounts} />
      <ShopSection products={shopProducts} isOwner={isOwner} limit={8} />
      <StepsSection />
      <StoriesSection stories={stories} />
      <FaqSection supportEmail={env.NEXT_PUBLIC_SUPPORT_EMAIL} />
    </div>
  );
}
