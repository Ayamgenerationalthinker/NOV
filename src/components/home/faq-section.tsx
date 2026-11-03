import { Plus } from 'lucide-react';
import { FAQS } from '@/content/home';
import { pageWidth, SectionHeading } from './primitives';

/** Native <details> accordion: works with the keyboard and without JavaScript. */
export function FaqSection({ supportEmail }: { supportEmail: string }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-paper py-14 lg:py-20">
      <div className={`${pageWidth} grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-20`}>
        <SectionHeading
          id="faq-title"
          eyebrow="Help"
          title="Questions before you buy"
          text="Paying, getting your file, and what to do if something goes wrong."
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.question} name="faq" className="faq-item rounded-3xl border border-line bg-card px-5">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 text-left text-[17px] font-bold leading-snug text-ink">
                {faq.question}
                <span className="faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand transition-transform duration-300">
                  <Plus className="h-5 w-5" aria-hidden />
                </span>
              </summary>
              <p className="pb-4 text-base leading-relaxed text-ink-soft">
                {faq.answer.split('{email}').map((part, i, parts) => (
                  <span key={i}>
                    {part}
                    {i < parts.length - 1 && (
                      <a href={`mailto:${supportEmail}`} className="font-medium text-brand-hover underline underline-offset-4">
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
    </section>
  );
}
