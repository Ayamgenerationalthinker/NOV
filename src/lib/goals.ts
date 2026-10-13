import { GOALS } from '@/content/home';

export interface GoalTaggable {
  tags?: string[] | null;
  categories?: Array<{ category?: { slug: string } | null }> | null;
}

const GOAL_SLUGS = new Set(GOALS.map((g) => g.slug));

export function isGoalSlug(value: string): boolean {
  return GOAL_SLUGS.has(value);
}

/** The goals a product belongs to: goal slugs found in its tags or its category slugs. */
export function productGoals(product: GoalTaggable): string[] {
  const found = new Set<string>();
  for (const tag of product.tags ?? []) {
    const slug = tag.trim().toLowerCase();
    if (GOAL_SLUGS.has(slug)) found.add(slug);
  }
  for (const link of product.categories ?? []) {
    const slug = link.category?.slug;
    if (slug && GOAL_SLUGS.has(slug)) found.add(slug);
  }
  return [...found];
}
