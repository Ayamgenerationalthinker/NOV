import { describe, expect, it } from 'vitest';
import { isFocusedRoute, isOwnerRoute, isPaperRoute } from '@/components/layout/site-chrome';
import { toShopProducts } from '@/lib/shop-product';

const base = {
  id: 'p1',
  title: 'A guide',
  shortDescription: 'First sentence here. Second sentence here.',
  coverImage: null,
  price: 25,
  discountPrice: null,
  currency: 'GHS',
  productKind: 'DIGITAL',
  productType: 'EBOOK',
  variants: [],
  tags: ['freelancing'],
};

describe('toShopProducts', () => {
  it('uses the written outcome and audience when a guide has them', () => {
    const [guide] = toShopProducts([{ ...base, slug: 'know-your-numbers' }]);
    expect(guide.outcome).toBe('Track income and costs, and see what is left after expenses.');
    expect(guide.audience).toBe('For small-business owners');
    expect(guide.label).toBe('PDF guide');
    expect(guide.goals).toEqual(['freelancing']);
  });

  it('falls back to the first sentence for a guide without written copy', () => {
    const [guide] = toShopProducts([{ ...base, slug: 'brand-new-guide' }]);
    expect(guide.outcome).toBe('First sentence here.');
    expect(guide.audience).toBeNull();
  });

  it('keeps the sale price and the original price apart', () => {
    const [guide] = toShopProducts([{ ...base, slug: 'on-sale', discountPrice: 20 }]);
    expect(guide.price).toBe(20);
    expect(guide.wasPrice).toBe(25);
  });

  it('lists guides with written copy first', () => {
    const list = toShopProducts([
      { ...base, id: 'new', slug: 'brand-new-guide' },
      { ...base, id: 'known', slug: 'know-your-numbers' },
    ]);
    expect(list.map((p) => p.id)).toEqual(['known', 'new']);
  });
});

describe('customer page theme', () => {
  it('covers the buying journey and leaves the owner screens alone', () => {
    for (const path of ['/', '/products', '/p/know-your-numbers', '/checkout', '/checkout/success']) {
      expect(isPaperRoute(path)).toBe(true);
    }
    for (const path of ['/admin', '/admin/products', '/login', '/cart', '/pricing']) {
      expect(isPaperRoute(path)).toBe(false);
    }
  });

  it('puts the owner and sign-in screens on the owner theme', () => {
    for (const path of ['/admin', '/admin/orders', '/login', '/register', '/account']) expect(isOwnerRoute(path)).toBe(true);
    for (const path of ['/', '/products', '/checkout']) expect(isOwnerRoute(path)).toBe(false);
  });

  it('keeps product and checkout pages on their own header', () => {
    expect(isFocusedRoute('/p/know-your-numbers')).toBe(true);
    expect(isFocusedRoute('/checkout')).toBe(true);
  });
});
