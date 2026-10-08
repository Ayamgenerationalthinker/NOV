import { Mail, Quote } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { TESTIMONIALS } from '@/content/home';
import { ghostButton, SectionHeading } from './primitives';

interface StoriesSectionProps {
  supportEmail: string;
  isOwner: boolean;
}

/**
 * Reader stories. Shows only what is in TESTIMONIALS (src/content/home.ts). While that list
 * is empty, visitors get an honest invitation to share a story instead of invented reviews.
 */
export function StoriesSection({ supportEmail, isOwner }: StoriesSectionProps) {
  return (
    <section id="stories" aria-labelledby="stories-title" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading id="stories-title" eyebrow="Reader stories" title="In readers’ own words." />

        {TESTIMONIALS.length > 0 ? (
          <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((story) => (
              <li key={`${story.name}-${story.quote.slice(0, 24)}`} data-reveal>
                <figure className="glass flex h-full flex-col rounded-3xl p-7">
                  <Quote className="h-6 w-6 text-brass" aria-hidden />
                  <blockquote className="mt-4 flex-1 text-base leading-relaxed text-cream/85">{story.quote}</blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="font-semibold text-cream">{story.name}</span>
                    {story.context && <span className="block text-cream/70">{story.context}</span>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        ) : (
          <div data-reveal className="glass mt-12 rounded-3xl border-dashed px-6 py-12 text-center sm:px-10">
            <p className="text-xl font-semibold tracking-tight text-cream">No stories here yet.</p>
            <p className="mx-auto mt-2 max-w-md text-base text-cream/70">
              We only publish real words from real readers. If one of our guides helped you, we would love to hear
              how.
            </p>
            <a href={`mailto:${supportEmail}?subject=My%20story`} className={`${ghostButton} mt-6`}>
              <Mail className="h-4 w-4" aria-hidden /> Share your story
            </a>
            {isOwner && (
              <p className="mx-auto mt-8 max-w-md border-t border-cream/10 pt-6 text-sm text-brass-200">
                Only you can see this note: add real testimonials to <code>TESTIMONIALS</code> in{' '}
                <code>src/content/home.ts</code> and they will replace this panel.
              </p>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
