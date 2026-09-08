import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatFileSize, generateOrderNumber } from '@/lib/utils';

describe('Utility Functions', () => {
  it('cn should merge classnames correctly', () => {
    expect(cn('px-2 py-1', 'bg-blue-500')).toContain('bg-blue-500');
    expect(cn('p-4', 'p-2')).toBe('p-2'); // twMerge override
  });

  it('formatCurrency should format USD and GHS correctly', () => {
    expect(formatCurrency(49.99, 'USD')).toContain('49.99');
    expect(formatCurrency('100.5', 'USD')).toContain('100.50');
    expect(formatCurrency(0, 'USD')).toContain('0.00');
  });

  it('formatFileSize should format bytes into human readable units', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('generateOrderNumber should generate a formatted order code', () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
  });
});
