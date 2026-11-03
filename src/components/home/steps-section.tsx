import { CreditCard, Download, Search } from 'lucide-react';
import { BUYING_STEPS } from '@/content/home';
import { pageWidth, SectionHeading } from './primitives';

const ICONS = [Search, CreditCard, Download];

export function StepsSection() {
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="relative overflow-hidden bg-ink py-14 text-white lg:py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_100%_0%,rgba(11,92,255,0.45),transparent_70%)]" />
      <div className={`${pageWidth} relative`}>
        <SectionHeading inverse id="steps-title" eyebrow="How it works" title="From choosing to reading in three steps" text="No sign-up and nothing to wait for in the post." />
        <ol className="mt-9 grid gap-4 md:grid-cols-3 lg:gap-5">
          {BUYING_STEPS.map((step, i) => {
            const Icon = ICONS[i] ?? Search;
            return (
              <li key={step.title} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-5 md:block md:p-6">
                <div className="flex shrink-0 items-start justify-between md:items-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span aria-hidden className="hidden font-heading text-4xl font-extrabold tabular-nums text-white/20 md:inline">
                    0{i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-white md:mt-5 md:text-xl">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-white/80 md:mt-2 md:text-base">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
