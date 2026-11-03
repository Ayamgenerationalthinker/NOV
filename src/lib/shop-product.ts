import { GUIDE_COPY } from '@/content/guides';
import { productGoals, type GoalTaggable } from '@/lib/goals';
import { availableStock } from '@/lib/product-purchase';
import { productTypeLabel } from '@/lib/product-types';

/** What a guide card needs to know about a product. Built on the server. */
export interface ShopProduct {
  id: string;
  slug: string;
  title: string;
  outcome: string | null;
  audience: string | null;
  coverImage: string | null;
  price: number;
  /** Set when the product is on sale; `price` is then the sale price. */
  wasPrice: number | null;
  currency: string;
  label: string;
  isPhysical: boolean;
  soldOut: boolean;
  goals: string[];
}

interface ProductRow extends GoalTaggable {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  coverImage: string | null;
  price: number;
  discountPrice: number | null;
  currency: string;
  productKind: string;
  productType: string | null;
  variants: Array<{ inventoryQuantity: number; reservedQuantity: number; isAvailable: boolean }>;
}

/** The first sentence of a description, for guides without their own outcome line. */
function firstSentence(text: string | null): string | null {
  const clean = text?.trim();
  if (!clean) return null;
  return clean.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? clean;
}

function toShopProduct(product: ProductRow): ShopProduct {
  const onSale = product.discountPrice != null && product.discountPrice < product.price;
  const isPhysical = product.productKind === 'PHYSICAL';
  const copy = GUIDE_COPY[product.slug];
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    outcome: copy?.outcome ?? firstSentence(product.shortDescription),
    audience: copy?.audience ?? null,
    coverImage: product.coverImage,
    price: onSale ? product.discountPrice! : product.price,
    wasPrice: onSale ? product.price : null,
    currency: product.currency,
    label: isPhysical ? 'Delivered' : product.productType === 'EBOOK' ? 'PDF guide' : productTypeLabel(product.productType),
    isPhysical,
    soldOut: isPhysical && product.variants.reduce((sum, v) => sum + availableStock(v), 0) === 0,
    goals: productGoals(product),
  };
}

/** Guides with written copy come first, in the order of GUIDE_COPY; anything newer follows. */
export function toShopProducts(products: ProductRow[]): ShopProduct[] {
  const order = Object.keys(GUIDE_COPY);
  const rank = (slug: string) => {
    const index = order.indexOf(slug);
    return index === -1 ? order.length : index;
  };
  return products.map(toShopProduct).sort((a, b) => rank(a.slug) - rank(b.slug));
}
