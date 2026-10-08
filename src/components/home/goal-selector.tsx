'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Briefcase, Check, Globe, Laptop, PiggyBank, PenTool, type LucideIcon } from 'lucide-react';
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

export function GoalSelector() {
  const { selected, select } = useGoal();
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
                    'glass group flex h-full w-full flex-col items-start gap-3 rounded-3xl p-4 text-left transition-all duration-700 ease-out hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass sm:p-5',
                    on && 'glow-brass !border-brass/70',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-700',
                      on ? 'bg-brass text-forest' : 'bg-cream/10 text-brass',
                    )}
                  >
                    {on ? <Check className="h-5 w-5" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
                  </span>
                  <span className="text-base font-semibold leading-tight text-cream">{goal.name}</span>
                  <span className="text-sm leading-snug text-cream/70">{goal.blurb}</span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-cream/70" aria-live="polite">
          {current ? (
            <>
              Showing guides for <strong className="font-semibold text-cream">{current.name}</strong>.{' '}
              <button
                type="button"
                onClick={() => select(null)}
                className="underline underline-offset-4 hover:text-cream"
              >
                Show everything
              </button>
            </>
          ) : (
            'Showing everything. Tap a goal to narrow it down.'
          )}
        </p>
      </Container>
    </section>
  );
}
