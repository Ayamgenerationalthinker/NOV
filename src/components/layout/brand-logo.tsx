import { cn } from '@/lib/utils';

/** Intrinsic size of /brand/tomevari-wordmark-80.webp (the supplied navy pill logo, transparent corners). */
const WIDTH = 267;
const HEIGHT = 80;

/**
 * The Tomevari wordmark from the supplied logo. Size it with a height class (h-8, h-10...);
 * the width follows the image's own proportions so it is never stretched.
 */
export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/tomevari-wordmark-80.webp"
      srcSet="/brand/tomevari-wordmark-80.webp 1x, /brand/tomevari-wordmark-160.webp 2x"
      alt="Tomevari"
      width={WIDTH}
      height={HEIGHT}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      className={cn('block h-9 w-auto select-none', className)}
    />
  );
}
