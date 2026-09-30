/**
 * What the owner may upload, shared by the server-side upload route and the direct-to-storage
 * upload token route. Product images live under media/ (publicly viewable via /api/media),
 * paid files under products/<productId>/ (only via signed download links).
 */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Delivery files (ebooks, zips, audio, video...). Large files upload straight to storage. */
export const MAX_PRODUCT_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

export function isMediaKey(key: string): boolean {
  return /^media\/[A-Za-z0-9._\/-]+$/.test(key) && !key.includes('..');
}

export function isProductFileKey(key: string, productId?: string): boolean {
  if (key.includes('..')) return false;
  const prefix = productId ? `products/${productId}/` : 'products/';
  return key.startsWith(prefix) && key.length > prefix.length;
}

export function safeFileName(name: string): string {
  const cleaned = name.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-120) || 'file';
}

export function isAllowedImage(fileName: string, contentType: string): boolean {
  const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  return IMAGE_EXTENSIONS.includes(ext) && IMAGE_TYPES.includes(contentType.toLowerCase());
}
