import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  text?: string;
  /** id for the <h2>, so the section can point at it with aria-labelledby. */
  id: string;
  /** Light text, for the navy section. */
  inverse?: boolean;
  className?: string;
}

export function SectionHeading({ title, text, id, inverse = false, className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <h2 id={id} className={cn('font-serif text-[28px] font-medium leading-[1.18] lg:text-[38px] lg:leading-[1.12]', inverse ? 'text-white' : 'text-ink')}>
        {title}
      </h2>
      {text && <p className={cn('mt-2 text-base leading-relaxed', inverse ? 'text-white/80' : 'text-ink-soft')}>{text}</p>}
    </div>
  );
}

const buttonBase =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] px-6 text-[15px] font-semibold transition-colors disabled:opacity-60';

export const primaryButton = cn(buttonBase, 'bg-brand text-white hover:bg-brand-hover');

export const secondaryButton = cn(buttonBase, 'border border-line-strong bg-card text-ink hover:border-ink');

/** Page-width wrapper shared by the customer pages. */
export const pageWidth = 'mx-auto w-full max-w-[1440px] px-4 lg:px-16';
