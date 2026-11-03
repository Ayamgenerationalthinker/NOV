import Link from 'next/link';
import { ArrowRight, Briefcase, Globe, Laptop, PenTool, PiggyBank, type LucideIcon } from 'lucide-react';
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
    <section id="goals" aria-labelledby="goals-title" className="bg-paper py-14 lg:py-20">
      <div className={pageWidth}>
        <SectionHeading id="goals-title" eyebrow="Browse by goal" title="What do you want to do next?" text="Choose a goal to see the guides written for it." />
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 lg:grid-cols-5 lg:gap-4">
          {GOALS.map((goal) => {
            const Icon = ICONS[goal.slug] ?? Briefcase;
            const count = counts[goal.slug] ?? 0;
            return (
              <li key={goal.slug} className="last:col-span-2 lg:last:col-span-1">
                <Link
                  href={`/products?goal=${goal.slug}`}
                  className="group flex h-full min-h-11 flex-col items-start gap-3 rounded-3xl border border-line bg-card p-4 transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_20px_40px_-24px_rgba(0,22,80,0.35)] motion-reduce:hover:translate-y-0 lg:p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-ink text-white shadow-[0_10px_20px_-10px_rgba(11,92,255,0.8)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-[17px] font-bold leading-snug text-ink">{goal.name}</span>
                    <span className="mt-1 hidden text-sm leading-normal text-ink-soft sm:block">{goal.blurb}</span>
                    <span className="mt-2 flex items-center gap-1 text-sm font-bold text-brand-hover">
                      {count > 0 ? `${count} guide${count === 1 ? '' : 's'}` : 'See guides'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
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
