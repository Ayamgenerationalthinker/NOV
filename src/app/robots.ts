import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/product-url';

/** Shop pages are open to search engines; checkout, receipts, sign-in and the owner screens are not. */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/checkout', '/cart', '/account', '/login', '/register', '/forgot-password', '/reset-password'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
