/**
 * Digital product categories the store sells. The ProductType enum in the database still holds
 * older values (AUDIO, SOFTWARE, GRAPHICS, ...) so existing rows stay readable, but new
 * and edited digital products may only use these four.
 */
export const DIGITAL_PRODUCT_TYPES = ['EBOOK', 'COURSE', 'VIDEO', 'TEMPLATE'] as const;
export type DigitalProductType = (typeof DIGITAL_PRODUCT_TYPES)[number];

/** Physical items keep their own internal type; they are not a shopper-facing category. */
export const PHYSICAL_PRODUCT_TYPE = 'PHYSICAL_GOOD' as const;

export const PRODUCT_TYPE_LABELS: Record<DigitalProductType, string> = {
  EBOOK: 'Ebook',
  COURSE: 'Course',
  VIDEO: 'Video',
  TEMPLATE: 'Template',
};

export const DIGITAL_PRODUCT_TYPE_OPTIONS = DIGITAL_PRODUCT_TYPES.map((value) => ({
  value,
  label: PRODUCT_TYPE_LABELS[value],
}));

export function isDigitalProductType(value: unknown): value is DigitalProductType {
  return typeof value === 'string' && (DIGITAL_PRODUCT_TYPES as readonly string[]).includes(value);
}

/**
 * Label for a stored product type. Products saved before the category change keep their record
 * but are shown under a generic label until the owner picks one of the current categories.
 */
export function productTypeLabel(value: string | null | undefined): string {
  return isDigitalProductType(value) ? PRODUCT_TYPE_LABELS[value] : 'Digital download';
}
