import { describe, it, expect } from 'vitest';
import { env } from '@/lib/env';

describe('Environment Configuration', () => {
  it('should load default environment variables', () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_APP_NAME).toBe('DigiCommerce');
  });
});
