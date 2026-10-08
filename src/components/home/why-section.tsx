import { Container } from '@/components/ui/container';
import { WHY_CARDS } from '@/content/home';
import { SectionHeading } from './primitives';
import { TiltCard } from './tilt-card';

export function WhySection() {
  return (
    <section id="why" aria-labelledby="why-title" className="relative overflow-hidden bg-gradient-to-b from-charcoal to-forest py-20 sm:py-28">
      <div
        aria-hidden
        data-parallax="18"
        className="pointer-events-none absolute right-[-10%] top-10 h-72 w-72 rounded-full bg-brass/10 blur-3xl"
      />
      <Container className="relative">
        <SectionHeading
          id="why-title"
          eyebrow="Why Tomevari"
          title="Made to be used, not just read."
          text="Clear guides you can act on, delivered the moment you pay."
        />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {WHY_CARDS.map((card) => (
            <li key={card.number} data-reveal>
              <TiltCard max={5} className="glass h-full rounded-3xl p-7 sm:p-8">
                <p className="text-5xl font-semibold tracking-tight text-brass text-glow-brass">{card.number}</p>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-cream">{card.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-cream/70">{card.text}</p>
              </TiltCard>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
