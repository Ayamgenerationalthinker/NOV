import { Download, Smartphone, UserRoundCheck } from 'lucide-react';
import { HERO_FACTS } from '@/content/home';
import { cn } from '@/lib/utils';

const ICONS = [Download, Smartphone, UserRoundCheck];

/** Three plain facts about buying here. Facts only; there are no numbers to invent. */
export function StatsStrip({ className }: { className?: string }) {
  return (
    <ul className={cn('glass grid gap-px overflow-hidden rounded-3xl sm:grid-cols-3', className)}>
      {HERO_FACTS.map((fact, i) => {
        const Icon = ICONS[i];
        return (
          <li key={fact.title} className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold text-cream">{fact.title}</span>
              <span className="block text-xs text-cream/70">{fact.text}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
