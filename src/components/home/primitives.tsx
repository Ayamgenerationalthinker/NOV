import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  title: string;
  text?: string;
  /** Small blue label above the title. */
  eyebrow?: string;
  /** id for the <h2>, so the section can point at it with aria-labelledby. */
  id: string;
  /** Light text, for the navy sections. */
  inverse?: boolean;
  className?: string;
}

export function SectionHeading({ title, text, eyebrow, id, inverse = false, className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow && (
        <p className={cn('text-sm font-bold uppercase tracking-[0.14em]', inverse ? 'text-[#8fb4ff]' : 'text-brand')}>{eyebrow}</p>
      )}
      <h2
        id={id}
        className={cn(
          'font-heading text-[30px] font-extrabold leading-[1.12] tracking-[-0.02em] lg:text-[44px]',
          eyebrow && 'mt-2',
          inverse ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {text && <p className={cn('mt-3 text-base leading-relaxed lg:text-lg', inverse ? 'text-white/80' : 'text-ink-soft')}>{text}</p>}
    </div>
  );
}

const buttonBase =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold transition duration-200 disabled:opacity-60';

export const primaryButton = cn(
  buttonBase,
  'bg-brand text-white shadow-[0_12px_28px_-12px_rgba(11,92,255,0.75)] hover:-translate-y-0.5 hover:bg-brand-hover motion-reduce:hover:translate-y-0',
);

export const secondaryButton = cn(buttonBase, 'border border-line-strong bg-card text-ink hover:border-ink');

/** Outline button for the navy sections. */
export const inverseButton = cn(buttonBase, 'border border-white/30 bg-white/10 text-white hover:bg-white/20');

/** Page-width wrapper shared by the customer pages. */
export const pageWidth = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10';
