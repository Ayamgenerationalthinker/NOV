import { cn } from '@/lib/utils';

/**
 * The TOMEVARI wordmark, set in type. It takes the colour of the text around it (white on the
 * navy bars), so it never sits in a box of its own. Size it with a height class (h-8, h-10...).
 */
export function BrandLogo({ className }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn('inline-flex h-9 select-none items-center font-heading text-[22px] font-extrabold uppercase leading-none tracking-[0.16em]', className)}>
      Tomevari
    </span>
  );
}
