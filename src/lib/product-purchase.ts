/**
 * Pure helpers shared by the product landing page and checkout: which options a buyer can pick,
 * how many are really available, and how URL params (?variant=, ?quantity=, ?coupon=) apply.
 */

export const DEFAULT_VARIANT_TITLE = 'Default';

export interface PurchasableVariant {
  id: string;
  sku: string;
  title: string;
  option1Value?: string | null;
  option2Value?: string | null;
  price: number;
  salePrice?: number | null;
  inventoryQuantity: number;
  reservedQuantity: number;
  isAvailable: boolean;
}

export interface PurchasableProduct {
  slug: string;
  productKind: 'DIGITAL' | 'PHYSICAL';
  price: number;
  discountPrice?: number | null;
  variants: PurchasableVariant[];
}

export interface BuyOption {
  id: string;
  label: string;
  price: number;
  compareAtPrice: number | null;
  available: number;
}

export interface BuyState {
  /** Options the buyer chooses between (empty when there is nothing to choose). */
  options: BuyOption[];
  /** Variant used when there are no visible options (hidden default variant). */
  defaultVariantId: string | null;
  selectedId: string | null;
  quantity: number;
  soldOut: boolean;
  coupon: string;
}

/** Most a buyer can order in one go, even with plenty of stock. */
export const MAX_QUANTITY_PER_ORDER = 20;

function isDefault(v: PurchasableVariant): boolean {
  return v.title === DEFAULT_VARIANT_TITLE && !v.option1Value;
}

export function availableStock(v: Pick<PurchasableVariant, 'inventoryQuantity' | 'reservedQuantity' | 'isAvailable'>): number {
  return v.isAvailable ? Math.max(0, v.inventoryQuantity - v.reservedQuantity) : 0;
}

function effectivePrice(price: number, sale?: number | null): { price: number; compareAtPrice: number | null } {
  return sale !== null && sale !== undefined && sale < price ? { price: sale, compareAtPrice: price } : { price, compareAtPrice: null };
}

export function productDisplayPrice(product: Pick<PurchasableProduct, 'price' | 'discountPrice'>) {
  return effectivePrice(product.price, product.discountPrice);
}

function firstParam(value: string | string[] | undefined | null): string | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function resolveBuyState(
  product: PurchasableProduct,
  params: { variant?: string | string[] | null; sku?: string | string[] | null; quantity?: string | string[] | null; coupon?: string | string[] | null; discount_code?: string | string[] | null }
): BuyState {
  const coupon = (firstParam(params.coupon) || firstParam(params.discount_code) || '').trim().slice(0, 50);

  if (product.productKind === 'DIGITAL') {
    return { options: [], defaultVariantId: null, selectedId: null, quantity: 1, soldOut: false, coupon };
  }

  const visible = product.variants.filter((v) => v.isAvailable && !isDefault(v));
  const defaultVariant = product.variants.find((v) => v.isAvailable && isDefault(v)) ?? null;

  const options: BuyOption[] = visible.map((v) => ({
    id: v.id,
    label: v.title,
    ...effectivePrice(v.price, v.salePrice),
    available: availableStock(v),
  }));

  let selectedId: string | null = null;
  if (options.length > 0) {
    const wanted = (firstParam(params.variant) || firstParam(params.sku) || '').trim().toLowerCase();
    const match = wanted
      ? visible.find(
          (v) =>
            v.id === wanted ||
            v.sku.toLowerCase() === wanted ||
            v.title.toLowerCase() === wanted ||
            (v.option1Value ?? '').toLowerCase() === wanted
        )
      : undefined;
    selectedId = match?.id ?? options.find((o) => o.available > 0)?.id ?? options[0].id;
  } else if (defaultVariant) {
    selectedId = defaultVariant.id;
  }

  const available = options.length > 0
    ? options.find((o) => o.id === selectedId)?.available ?? 0
    : defaultVariant
      ? availableStock(defaultVariant)
      : 0;

  const requested = parseInt(firstParam(params.quantity) || '1', 10);
  const quantity = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 1, Math.max(1, available), MAX_QUANTITY_PER_ORDER));

  return {
    options,
    defaultVariantId: defaultVariant?.id ?? null,
    selectedId,
    quantity,
    soldOut: options.length > 0 ? options.every((o) => o.available === 0) : available === 0,
    coupon,
  };
}

/** Checkout link for a single product ("Buy now"). */
export function buildCheckoutUrl({
  slug,
  variantId,
  quantity,
  coupon,
}: {
  slug: string;
  variantId?: string | null;
  quantity?: number;
  coupon?: string;
}): string {
  const query = new URLSearchParams({ product: slug });
  if (variantId) query.set('variant', variantId);
  if (quantity && quantity > 1) query.set('quantity', String(quantity));
  if (coupon) query.set('coupon', coupon);
  return `/checkout?${query.toString()}`;
}
