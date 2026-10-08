import { describe, expect, it } from 'vitest';
import { isGoalSlug, productGoals } from '@/lib/goals';

describe('productGoals', () => {
  it('reads goals from tags, ignoring other tags and letter case', () => {
    expect(productGoals({ tags: ['Freelancing', 'bestseller', ' online-income '] })).toEqual(['freelancing', 'online-income']);
  });

  it('reads goals from category slugs and does not repeat a goal found twice', () => {
    expect(
      productGoals({
        tags: ['freelancing'],
        categories: [{ category: { slug: 'freelancing' } }, { category: { slug: 'software' } }],
      }),
    ).toEqual(['freelancing']);
  });

  it('returns nothing for a product with no goal', () => {
    expect(productGoals({ tags: null, categories: null })).toEqual([]);
    expect(isGoalSlug('software')).toBe(false);
  });
});
