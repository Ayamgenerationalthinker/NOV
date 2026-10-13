import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { WHY_CARDS } from '@/content/home';
import { SectionHeading } from './primitives';
import { TiltCard } from './tilt-card';

export function WhySection() {
  return (
    <section
      id="why"
      aria-labelledby="why-title"
      className="light relative overflow-hidden bg-gradient-to-b from-deep to-surface py-20 text-fg sm:py-28"
    >
      <div
        aria-hidden
        data-parallax="18"
        className="pointer-events-none absolute right-[-10%] top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />
      <Container className="relative">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="why-title"
            eyebrow="Why Tomevari"
            title="Made to be used, not just read."
            text="Clear guides you can act on, delivered the moment you pay."
          />
          <a
            href="#how-it-works"
            data-reveal
            className="group inline-flex items-center gap-2 rounded-full text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            See how buying works
            <ArrowRight className="h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" aria-hidden />
          </a>
        </div>
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {WHY_CARDS.map((card) => (
            <li key={card.number} data-reveal>
              <TiltCard max={5} className="glass flex h-full flex-col rounded-3xl p-7 sm:p-8">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-5xl font-semibold tracking-tight text-accent text-glow-accent">{card.number}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fg/60">{card.tag}</span>
                </p>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-fg">{card.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-fg/70">{card.text}</p>
              </TiltCard>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
