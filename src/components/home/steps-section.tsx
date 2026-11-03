import { BUYING_STEPS } from '@/content/home';
import { pageWidth, SectionHeading } from './primitives';

export function StepsSection() {
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="bg-ink py-10 text-white lg:py-[72px]">
      <div className={pageWidth}>
        <SectionHeading inverse id="steps-title" title="How buying works" text="No sign-up and nothing to wait for in the post." />
        <ol className="mt-6 grid gap-6 md:grid-cols-3 lg:mt-9 lg:gap-8">
          {BUYING_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 md:flex-col md:gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[15px] font-bold tabular-nums text-ink">
                {i + 1}
              </span>
              <div>
                <h3 className="text-xl font-bold leading-tight text-white">{step.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-white/80">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
