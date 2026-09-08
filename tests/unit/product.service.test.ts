import { describe, it, expect } from 'vitest';
import { ProductService } from '@/services/product/product.service';

describe('ProductService', () => {
  it('should slugify product titles accurately and handle special characters', () => {
    expect(ProductService.slugify('Next.js 15 Masterclass & Pro Guide!')).toBe('nextjs-15-masterclass-pro-guide');
    expect(ProductService.slugify('  The Complete E-book (2026 Edition)  ')).toBe('the-complete-e-book-2026-edition');
    expect(ProductService.slugify('Ghana Mobile Money & Flutterwave Setup')).toBe('ghana-mobile-money-flutterwave-setup');
  });
});
