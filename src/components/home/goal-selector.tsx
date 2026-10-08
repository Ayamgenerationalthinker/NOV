'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, Briefcase, Check, Globe, Laptop, PiggyBank, PenTool, type LucideIcon } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { GOALS } from '@/content/home';
import { cn } from '@/lib/utils';
import { useGoal } from './goal-context';
import { SectionHeading } from './primitives';
import { useInView, useSceneMode } from './use-scene-mode';

const GoalScene = dynamic(() => import('./goal-scene'), { ssr: false });

const ICONS: Record<string, LucideIcon> = {
  'start-a-business': Briefcase,
  'online-income': Globe,
  'saving-investing': PiggyBank,
  freelancing: PenTool,
  'digital-skills': Laptop,
};

const readoutLabel = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-200';

interface GoalSelectorProps {
  /** Published products per goal slug, counted on the server. */
  counts: Record<string, number>;
  /** All published products. */
  total: number;
}

export function GoalSelector({ counts, total }: GoalSelectorProps) {
  const { selected, select } = useGoal();
  const shown = selected ? (counts[selected] ?? 0) : total;
  const mode = useSceneMode();
  const { ref, inView } = useInView<HTMLElement>();
  const current = GOALS.find((goal) => goal.slug === selected);

  // The 3D backdrop is mounted the first time the section nears the screen, then paused
  // whenever it scrolls away.
  const [seen, setSeen] = useState(false);
  if (inView && !seen) setSeen(true);

  return (
    <section ref={ref} aria-labelledby="goals-title" className="relative overflow-hidden py-20 sm:pb-20 sm:pt-28">
      {/* A tinted wash per goal. It is the whole backdrop when 3D is off, and sits under it otherwise. */}
      <div aria-hidden className="absolute inset-0">
        {GOALS.map((goal) => (
          <div
            key={goal.slug}
            className={cn(
              'absolute inset-0 transition-opacity duration-[800ms] ease-out',
              selected === goal.slug ? 'opacity-100' : 'opacity-0',
            )}
            style={{ background: `radial-gradient(60% 70% at 50% 40%, ${goal.color}26, transparent 70%)` }}
          />
        ))}
      </div>
      {mode === '3d' && seen && <GoalScene selected={selected} active={inView} />}

      <Container className="relative">
        <SectionHeading
          id="goals-title"
          eyebrow="Chosen for your goal"
          title="Where do you want to grow?"
          text="Pick a goal and the shop below shows the guides written for it."
        />

        <div
          role="group"
          aria-label="Filter the shop by goal"
          className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4"
        >
          {GOALS.map((goal) => {
            const Icon = ICONS[goal.slug] ?? Briefcase;
            const on = selected === goal.slug;
            return (
              <div key={goal.slug} data-reveal className="last:col-span-2 sm:last:col-span-1">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => select(on ? null : goal.slug)}
                  className={cn(
                    'glass group flex h-full w-full flex-col items-start gap-3 rounded-3xl p-4 text-left transition-all duration-700 ease-out hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-5',
                    on && 'glow-accent !border-accent/70',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-700',
                      on ? 'bg-accent text-surface' : 'bg-fg/10 text-accent',
                    )}
                  >
                    {on ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                  </span>
                  <span className="text-base font-semibold leading-tight text-fg">{goal.name}</span>
                  <span className="text-sm leading-snug text-fg/70">{goal.blurb}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* What is picked right now, and what the shop below is showing because of it */}
        <div data-reveal className="glass mt-6 rounded-3xl p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <dl aria-live="polite" className="grid gap-4 sm:grid-cols-[1fr_1.6fr_auto] sm:gap-8">
              <div>
                <dt className={readoutLabel}>Active selection</dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight text-fg">{current ? current.name : 'All goals'}</dd>
              </div>
              <div>
                <dt className={readoutLabel}>Focus</dt>
                <dd className="mt-1 text-sm leading-snug text-fg/80">
                  {current ? current.blurb : 'Every guide in the shop. Tap a goal to narrow it down.'}
                </dd>
              </div>
              <div>
                <dt className={readoutLabel}>Guides</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-fg">
                  {shown === 0 ? 'Coming soon' : shown}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a
                href="#shop"
                className="group inline-flex items-center gap-2 rounded-full font-semibold text-accent-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {current ? 'See these guides' : 'Explore all guides'}
                <ArrowDown className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-y-0.5" aria-hidden />
              </a>
              {current && (
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="rounded-full text-fg/70 underline underline-offset-4 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                >
                  Show everything
                </button>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
