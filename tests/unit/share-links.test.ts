import { describe, it, expect, vi } from 'vitest';
import { productPath, productUrl } from '@/lib/product-url';
import { buildProductMetadata, absoluteUrl } from '@/lib/product-metadata';
import { whatsAppShareUrl } from '@/components/admin/share-product-buttons';
import { isFocusedRoute } from '@/components/layout/site-chrome';
import { env } from '@/lib/env';

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  usePathname: vi.fn(),
}));

const product = {
  slug: 'side-hustle-playbook',
  title: 'The Side-Hustle Playbook',
  description: 'A practical guide to earning extra income in Ghana.\nChapter one…',
  shortDescription: 'A practical guide to earning extra income in Ghana.',
  coverImage: '/uploads/products/cover-abc123.png',
  galleryImages: [],
  isPublished: true,
};

describe('Shareable product links', () => {
  it('uses the short /p/[slug] path', () => {
    expect(productPath('kente-tote')).toBe('/p/kente-tote');
    expect(productUrl('kente-tote')).toMatch(/^https?:\/\/[^/]+\/p\/kente-tote$/);
  });

  it('builds a wa.me link with the title and URL', () => {
    const link = whatsAppShareUrl('Kente Tote & Bag', 'https://shop.example.com/p/kente-tote');
    expect(link.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Kente Tote & Bag\nhttps://shop.example.com/p/kente-tote');
  });

  it('hides the shop header/footer only on /p/ pages', () => {
    expect(isFocusedRoute('/p/kente-tote')).toBe(true);
    expect(isFocusedRoute('/products')).toBe(false);
    expect(isFocusedRoute('/pricing')).toBe(false);
    expect(isFocusedRoute('/checkout')).toBe(false);
  });

  it('redirects /products/[slug] to /p/[slug] and keeps coupon/quantity/variant', async () => {
    const { default: LegacyProductPage } = await import('@/app/(storefront)/products/[slug]/page');
    await expect(
      LegacyProductPage({
        params: Promise.resolve({ slug: 'kente-tote' }),
        searchParams: Promise.resolve({ coupon: 'EASTER', quantity: '2', variant: 'M' }),
      })
    ).rejects.toThrow('NEXT_REDIRECT:/p/kente-tote?coupon=EASTER&quantity=2&variant=M');
  });
});

describe('Open Graph / Twitter preview metadata', () => {
  it('turns an uploaded cover path into an absolute image URL on NEXT_PUBLIC_APP_URL', () => {
    const meta = buildProductMetadata(product);
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
    const ogImages = meta.openGraph?.images as Array<{ url: string }>;

    expect(ogImages[0].url).toBe(`${base}/uploads/products/cover-abc123.png`);
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [`${base}/uploads/products/cover-abc123.png`] });
    expect(meta.openGraph).toMatchObject({ url: `${base}/p/side-hustle-playbook`, title: product.title });
    expect(meta.description).toBe(product.shortDescription);
  });

  it('keeps absolute (R2/CDN) image URLs as they are', () => {
    expect(absoluteUrl('https://cdn.example.com/cover.png')).toBe('https://cdn.example.com/cover.png');
  });

  it('falls back to the first gallery photo when there is no cover', () => {
    const meta = buildProductMetadata({ ...product, coverImage: null, galleryImages: ['https://cdn.example.com/g1.jpg'] });
    expect((meta.openGraph?.images as Array<{ url: string }>)[0].url).toBe('https://cdn.example.com/g1.jpg');
  });

  it('reveals nothing about drafts', () => {
    const meta = buildProductMetadata({ ...product, isPublished: false });
    expect(meta.title).toBe('Product not found');
    expect(meta.openGraph).toBeUndefined();
    expect(meta.robots).toMatchObject({ index: false });
  });
});
