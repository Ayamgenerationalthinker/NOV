import Image from 'next/image';

/** Covers the image optimiser may resize: the shop's own media route and its live address. */
function canOptimize(src: string): boolean {
  return src.startsWith('/api/media/') || src.startsWith('https://tomevari.vercel.app/api/media/');
}

interface CoverImageProps {
  src: string;
  className?: string;
  /** Rendered width at each breakpoint, so phones download a small file. */
  sizes: string;
  priority?: boolean;
  /** Empty when a title beside the cover already names it. */
  alt?: string;
}

/**
 * A product cover, resized and compressed for the screen it is shown on. Uploaded covers are often
 * 1–2 MB; this sends a few dozen KB instead. Anything else falls back to a plain image.
 */
export function CoverImage({ src, className, sizes, priority = false, alt = '' }: CoverImageProps) {
  if (!canOptimize(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} width={300} height={400} loading={priority ? 'eager' : 'lazy'} decoding="async" className={className} />
    );
  }
  return <Image src={src} alt={alt} width={600} height={800} sizes={sizes} priority={priority} className={className} />;
}
