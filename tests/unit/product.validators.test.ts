import { describe, it, expect } from 'vitest';
import { productCreateSchema, productFilterSchema, productUpdateSchema } from '@/lib/validators/product';
import { ProductType } from '@prisma/client';

describe('Product Validators', () => {
  it('should validate valid product creation input', () => {
    const valid = productCreateSchema.safeParse({
      title: 'Next.js SaaS Production Blueprint',
      description: 'The ultimate production template for SaaS with payments and auth.',
      price: 79.99,
      discountPrice: 49.99,
      productType: ProductType.COURSE,
      features: ['Full auth', 'Payment integration'],
    });

    expect(valid.success).toBe(true);
  });

  it('accepts only Ebook, Course and Video as digital categories', () => {
    const base = { title: 'Sample Product', description: 'A valid description for the test product.', price: 10 };
    for (const ok of [ProductType.EBOOK, ProductType.COURSE, ProductType.VIDEO]) {
      expect(productCreateSchema.safeParse({ ...base, productType: ok }).success).toBe(true);
    }
    for (const retired of [ProductType.GRAPHICS, ProductType.SOFTWARE, ProductType.AUDIO, ProductType.TEMPLATE]) {
      const result = productCreateSchema.safeParse({ ...base, productType: retired });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toMatch(/Ebook, Course or Video/);
    }
  });

  it('rejects retired categories on updates too', () => {
    expect(productUpdateSchema.safeParse({ productType: ProductType.AUDIO }).success).toBe(false);
    expect(productUpdateSchema.safeParse({ productType: ProductType.VIDEO }).success).toBe(true);
    // Omitting the category on a partial update leaves it unchanged.
    expect(productUpdateSchema.safeParse({ price: 20 }).data).not.toHaveProperty('productType');
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
