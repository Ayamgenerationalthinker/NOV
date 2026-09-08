import { describe, it, expect } from 'vitest';
import { productCreateSchema, productFilterSchema } from '@/lib/validators/product';
import { ProductType } from '@prisma/client';

describe('Product Validators', () => {
  it('should validate valid product creation input', () => {
    const valid = productCreateSchema.safeParse({
      title: 'Next.js SaaS Production Blueprint',
      description: 'The ultimate production template for SaaS with payments and auth.',
      price: 79.99,
      discountPrice: 49.99,
      productType: ProductType.TEMPLATE,
      features: ['Full auth', 'Payment integration'],
    });

    expect(valid.success).toBe(true);
  });

  it('should reject invalid slugs', () => {
    const invalidSlug = productCreateSchema.safeParse({
      title: 'Sample Product',
      slug: 'INVALID SLUG WITH SPACES',
      description: 'A valid description for the test product.',
      price: 19.99,
    });

    expect(invalidSlug.success).toBe(false);
  });

  it('should reject negative prices', () => {
    const negativePrice = productCreateSchema.safeParse({
      title: 'Sample Product',
      description: 'A valid description for the test product.',
      price: -10,
    });

    expect(negativePrice.success).toBe(false);
  });

  it('should validate product filter input with default pagination', () => {
    const parsed = productFilterSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(12);
      expect(parsed.data.sort).toBe('newest');
    }
  });
});
