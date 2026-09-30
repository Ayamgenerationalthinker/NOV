import { describe, it, expect } from 'vitest';
import {
  resolveBuyState,
  buildCheckoutUrl,
  availableStock,
  PurchasableProduct,
  PurchasableVariant,
  DEFAULT_VARIANT_TITLE,
  MAX_QUANTITY_PER_ORDER,
} from '@/lib/product-purchase';

function v(overrides: Partial<PurchasableVariant>): PurchasableVariant {
  return {
    id: 'v',
    sku: 'sku',
    title: DEFAULT_VARIANT_TITLE,
    option1Value: null,
    price: 200,
    salePrice: null,
    inventoryQuantity: 5,
    reservedQuantity: 0,
    isAvailable: true,
    ...overrides,
  };
}

const physical = (variants: PurchasableVariant[]): PurchasableProduct => ({
  slug: 'kente-tote',
  productKind: 'PHYSICAL',
  price: 200,
  discountPrice: null,
  variants,
});

const sized = physical([
  v({ id: 'v-s', sku: 'TOTE-S', title: 'S', option1Value: 'S', inventoryQuantity: 0 }),
  v({ id: 'v-m', sku: 'TOTE-M', title: 'M', option1Value: 'M', inventoryQuantity: 4, reservedQuantity: 1 }),
  v({ id: 'v-l', sku: 'TOTE-L', title: 'L', option1Value: 'L', inventoryQuantity: 9, salePrice: 150 }),
]);

describe('Product landing page purchase rules', () => {
  it('uses real available stock (on hand minus reserved), never a made-up number', () => {
    expect(availableStock(v({ inventoryQuantity: 4, reservedQuantity: 1 }))).toBe(3);
    expect(availableStock(v({ inventoryQuantity: 2, reservedQuantity: 5 }))).toBe(0);
    expect(availableStock(v({ inventoryQuantity: 9, isAvailable: false }))).toBe(0);

    const state = resolveBuyState(physical([v({ inventoryQuantity: 3 })]), {});
    expect(state.options).toEqual([]);
    expect(state.selectedId).toBe('v');
    expect(state.soldOut).toBe(false);
  });

  it('shows a product without options as sold out when its stock is 0', () => {
    expect(resolveBuyState(physical([v({ inventoryQuantity: 0 })]), {}).soldOut).toBe(true);
    // No stock record at all is also sold out, not "10 in stock"
    expect(resolveBuyState(physical([]), {}).soldOut).toBe(true);
  });

  it('lists options with their own stock and skips sold-out ones for the default selection', () => {
    const state = resolveBuyState(sized, {});
    expect(state.options.map((o) => [o.label, o.available])).toEqual([['S', 0], ['M', 3], ['L', 9]]);
    expect(state.selectedId).toBe('v-m');
    expect(state.soldOut).toBe(false);
    expect(state.options.find((o) => o.id === 'v-l')).toMatchObject({ price: 150, compareAtPrice: 200 });
  });

  it('is sold out only when every option is sold out', () => {
    const allOut = physical([v({ id: 'a', title: 'S', option1Value: 'S', inventoryQuantity: 0 }), v({ id: 'b', title: 'M', option1Value: 'M', inventoryQuantity: 0 })]);
    expect(resolveBuyState(allOut, {}).soldOut).toBe(true);
  });

  it('honours ?variant= by id, sku, title or option value', () => {
    expect(resolveBuyState(sized, { variant: 'v-l' }).selectedId).toBe('v-l');
    expect(resolveBuyState(sized, { variant: 'tote-l' }).selectedId).toBe('v-l');
    expect(resolveBuyState(sized, { variant: 'L' }).selectedId).toBe('v-l');
    expect(resolveBuyState(sized, { sku: 'TOTE-M' }).selectedId).toBe('v-m');
    expect(resolveBuyState(sized, { variant: 'XXL' }).selectedId).toBe('v-m');
  });

  it('clamps ?quantity= to real stock and the per-order cap', () => {
    expect(resolveBuyState(sized, { variant: 'M', quantity: '2' }).quantity).toBe(2);
    expect(resolveBuyState(sized, { variant: 'M', quantity: '50' }).quantity).toBe(3);
    expect(resolveBuyState(sized, { variant: 'M', quantity: '-4' }).quantity).toBe(1);
    expect(resolveBuyState(sized, { variant: 'M', quantity: 'abc' }).quantity).toBe(1);
    expect(resolveBuyState(physical([v({ inventoryQuantity: 500 })]), { quantity: '100' }).quantity).toBe(MAX_QUANTITY_PER_ORDER);
  });

  it('keeps ?coupon= (and the discount_code alias)', () => {
    expect(resolveBuyState(sized, { coupon: 'EASTER' }).coupon).toBe('EASTER');
    expect(resolveBuyState(sized, { discount_code: 'AKWABA' }).coupon).toBe('AKWABA');
  });

  it('digital products are always quantity 1 and never sold out', () => {
    const state = resolveBuyState({ slug: 'ebook', productKind: 'DIGITAL', price: 50, variants: [] }, { quantity: '5' });
    expect(state).toMatchObject({ quantity: 1, soldOut: false, options: [] });
  });

  it('builds a Buy now link that goes straight to checkout for this product only', () => {
    expect(buildCheckoutUrl({ slug: 'kente-tote', variantId: 'v-m', quantity: 2, coupon: 'EASTER' })).toBe(
      '/checkout?product=kente-tote&variant=v-m&quantity=2&coupon=EASTER'
    );
    expect(buildCheckoutUrl({ slug: 'ebook', quantity: 1 })).toBe('/checkout?product=ebook');
  });
});
