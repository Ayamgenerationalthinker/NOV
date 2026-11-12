'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

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
 * 1–2 MB; this sends a few dozen KB instead. If resizing fails the original file is tried, and if
 * that fails too (storage offline) a plain book placeholder shows instead of a broken image.
 */
export function CoverImage({ src, className, sizes, priority = false, alt = '' }: CoverImageProps) {
  const [stage, setStage] = useState<'optimized' | 'original' | 'missing'>(canOptimize(src) ? 'optimized' : 'original');

  if (stage === 'missing') {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className="flex aspect-[3/4] w-full max-w-[120px] items-center justify-center sm:h-full sm:w-auto sm:max-w-full rounded-lg bg-gradient-to-br from-[#0b5cff] to-[#001650] text-[#ffffff] shadow-[0_16px_30px_-14px_rgba(0,22,80,0.55)]"
      >
        <BookOpen className="h-1/4 w-1/4" aria-hidden />
      </span>
    );
  }

  if (stage === 'original') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={300}
        height={400}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        onError={() => setStage('missing')}
      />
    );
  }

  return <Image src={src} alt={alt} width={600} height={800} sizes={sizes} priority={priority} className={className} onError={() => setStage('original')} />;
}
