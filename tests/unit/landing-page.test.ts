import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '@/services/product/product.service';
import { ReviewService } from '@/services/review/review.service';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const published = {
  id: 'p1',
  slug: 'side-hustle-playbook',
  title: 'The Side-Hustle Playbook',
  description: 'A practical guide.',
  shortDescription: null,
  productKind: 'DIGITAL',
  productType: 'EBOOK',
  price: 50,
  discountPrice: null,
  currency: 'GHS',
  coverImage: null,
  galleryImages: [],
  whatsIncluded: [],
  features: [],
  model3dUrl: null,
  model3dPoster: null,
  isPublished: true,
  variants: [],
  files: [{ id: 'f1', fileName: 'playbook.pdf', fileSize: 1024 }],
  store: null,
};

async function render(slug: string) {
  const { default: Page } = await import('@/app/p/[slug]/page');
  return Page({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });
}

describe('/p/[slug] landing page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ReviewService, 'getProductReviews').mockResolvedValue({
      reviews: [],
      metrics: { totalReviews: 0, averageRating: 0 },
    } as any);
  });

  it('returns "not found" for a draft product', async () => {
    vi.spyOn(ProductService, 'getProductBySlug').mockResolvedValue({ ...published, isPublished: false } as any);
    await expect(render('side-hustle-playbook')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('returns "not found" for an unknown slug', async () => {
    vi.spyOn(ProductService, 'getProductBySlug').mockResolvedValue(null);
    await expect(render('nope')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders a published product', async () => {
    vi.spyOn(ProductService, 'getProductBySlug').mockResolvedValue(published as any);
    await expect(render('side-hustle-playbook')).resolves.toBeTruthy();
  });
});
