import { permanentRedirect } from 'next/navigation';
import { productPath } from '@/lib/product-url';

interface LegacyProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Old product URLs keep working: /products/[slug] -> /p/[slug], keeping ?coupon=, ?quantity=, ?variant=. */
export default async function LegacyProductPage({ params, searchParams }: LegacyProductPageProps) {
  const { slug } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value !== undefined ? [value] : []) query.append(key, v);
  }
  const qs = query.toString();
  permanentRedirect(`${productPath(slug)}${qs ? `?${qs}` : ''}`);
}
