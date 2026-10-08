import { Container } from '@/components/ui/container';
import { BUYING_STEPS } from '@/content/home';
import { SectionHeading } from './primitives';

export function StepsSection() {
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="relative py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <SectionHeading
            id="steps-title"
            eyebrow="Ready in minutes"
            title="From choosing to reading in three steps."
            text="No sign-up, no waiting for delivery. Everything happens on your phone."
            className="lg:sticky lg:top-28 lg:self-start"
          />

          <ol className="relative space-y-6">
            {/* The line draws itself down the timeline as you scroll */}
            <span aria-hidden className="absolute bottom-6 left-6 top-6 w-px bg-cream/10" />
            <span aria-hidden data-grow-line className="absolute bottom-6 left-6 top-6 w-px origin-top bg-brass" />

            {BUYING_STEPS.map((step, i) => (
              <li key={step.title} data-reveal className="relative flex gap-5">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brass/50 bg-forest text-base font-semibold tabular-nums text-brass glow-brass">
                  {i + 1}
                </span>
                <div className="glass flex-1 rounded-3xl p-6">
                  <h3 className="text-xl font-semibold tracking-tight text-cream">{step.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-cream/70">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
