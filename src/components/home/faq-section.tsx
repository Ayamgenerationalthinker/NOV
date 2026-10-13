import { Plus } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { FAQS } from '@/content/home';
import { SectionHeading } from './primitives';

/** Native <details> accordion: works with the keyboard and without JavaScript. */
export function FaqSection({ supportEmail }: { supportEmail: string }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="light relative bg-deep py-20 text-fg sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <SectionHeading
            id="faq-title"
            eyebrow="FAQ"
            title="Questions, answered."
            text="Paying, getting your files, and what to do if something goes wrong."
            className="lg:sticky lg:top-28 lg:self-start"
          />

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.question} name="faq" data-reveal className="faq-item glass group rounded-3xl">
                <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl px-6 py-5 text-left text-base font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-lg">
                  {faq.question}
                  <span className="faq-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg/10 text-accent transition-transform duration-500 ease-out">
                    <Plus className="h-4 w-4" aria-hidden />
                  </span>
                </summary>
                <p className="px-6 pb-6 text-base leading-relaxed text-fg/75">
                  {faq.answer.split('{email}').map((part, i, parts) => (
                    <span key={i}>
                      {part}
                      {i < parts.length - 1 && (
                        <a href={`mailto:${supportEmail}`} className="font-medium text-accent-200 underline underline-offset-4">
                          {supportEmail}
                        </a>
                      )}
                    </span>
                  ))}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
