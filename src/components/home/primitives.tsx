import { cn } from '@/lib/utils';

/** Small uppercase label in a pill, used above every section heading. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-brass/40 bg-brass/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-200',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  text?: string;
  /** id for the <h2>, so the section can point at it with aria-labelledby. */
  id: string;
  className?: string;
}

export function SectionHeading({ eyebrow, title, text, id, className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <div data-reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h2 id={id} data-reveal className="mt-4 text-3xl font-semibold tracking-tight text-cream sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text && (
        <p data-reveal className="mt-4 text-base leading-relaxed text-cream/70 sm:text-lg">
          {text}
        </p>
      )}
    </div>
  );
}

export const primaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brass px-6 text-sm font-semibold text-forest transition duration-300 ease-out hover:bg-brass-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream glow-brass';

export const ghostButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-cream/25 bg-cream/5 px-6 text-sm font-semibold text-cream backdrop-blur transition duration-300 ease-out hover:border-cream/50 hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream';
