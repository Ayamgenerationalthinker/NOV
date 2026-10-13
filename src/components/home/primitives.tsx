import { cn } from '@/lib/utils';

/** Small uppercase label in a pill, used above every section heading. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-200',
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
      <h2 id={id} data-reveal className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text && (
        <p data-reveal className="mt-4 text-base leading-relaxed text-fg/70 sm:text-lg">
          {text}
        </p>
      )}
    </div>
  );
}

export const primaryButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-surface transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-accent-200 motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg glow-accent';

export const ghostButton =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-fg/25 bg-fg/5 px-6 text-sm font-semibold text-fg backdrop-blur transition duration-300 ease-out hover:border-fg/50 hover:bg-fg/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg';
