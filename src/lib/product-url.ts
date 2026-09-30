/**
 * The public, shareable address of a product. Every "copy link" / share button and the
 * Open Graph metadata use these helpers, so the URL format lives in one place.
 */
export function productPath(slug: string): string {
  return `/products/${slug}`;
}

/** Site origin: NEXT_PUBLIC_APP_URL when configured, else the browser's origin. */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

export function productUrl(slug: string): string {
  return `${siteOrigin()}${productPath(slug)}`;
}
