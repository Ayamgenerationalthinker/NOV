import Link from 'next/link';
import { Briefcase, Globe, Laptop, PenTool, PiggyBank, type LucideIcon } from 'lucide-react';
import { GOALS } from '@/content/home';
import { pageWidth, SectionHeading } from './primitives';

const ICONS: Record<string, LucideIcon> = {
  'start-a-business': Briefcase,
  'online-income': Globe,
  'saving-investing': PiggyBank,
  freelancing: PenTool,
  'digital-skills': Laptop,
};

/** Each tile opens the shop filtered to that goal. */
export function GoalTiles({ counts }: { counts: Record<string, number> }) {
  return (
    <section id="goals" aria-labelledby="goals-title" className="bg-band py-8 lg:py-10">
      <div className={pageWidth}>
        <SectionHeading id="goals-title" title="What do you want to do next?" text="Choose a goal to see the guides written for it." />
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {GOALS.map((goal) => {
            const Icon = ICONS[goal.slug] ?? Briefcase;
            const count = counts[goal.slug] ?? 0;
            return (
              <li key={goal.slug}>
                <Link
                  href={`/products?goal=${goal.slug}`}
                  className="flex h-full min-h-11 items-center gap-3 rounded-[14px] border border-line bg-card p-3 transition-colors hover:border-ink lg:flex-col lg:items-start lg:p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand-hover">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[17px] font-bold leading-snug text-ink">{goal.name}</span>
                    <span className="mt-0.5 block text-sm leading-normal text-ink-soft">{goal.blurb}</span>
                    {count > 0 && (
                      <span className="mt-1 block text-[13px] font-semibold text-brand-hover">
                        {count} guide{count === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
