import type { Metadata } from 'next';
import { env } from '@/lib/env';
import { productUrl } from '@/lib/product-url';

interface MetadataProduct {
  slug: string;
  title: string;
  description: string;
  shortDescription?: string | null;
  coverImage?: string | null;
  galleryImages?: string[];
  isPublished: boolean;
}

/** WhatsApp/Facebook/X only render preview images from absolute URLs. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function summarize(product: MetadataProduct): string {
  const text = (product.shortDescription || product.description || '').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export function buildProductMetadata(product: MetadataProduct | null): Metadata {
  if (!product || !product.isPublished) {
    return { title: 'Product not found', robots: { index: false, follow: false } };
  }

  const url = productUrl(product.slug);
  const description = summarize(product);
  const image = product.coverImage || product.galleryImages?.[0];
  const images = image ? [{ url: absoluteUrl(image), alt: product.title }] : undefined;

  return {
    title: product.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: env.NEXT_PUBLIC_APP_NAME,
      title: product.title,
      description,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: product.title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}
