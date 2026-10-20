import { Quote } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { SectionHeading } from './primitives';
import { ShareStoryForm } from './share-story-form';

export interface PublishedStory {
  id: string;
  name: string;
  context: string | null;
  quote: string;
}

/**
 * Reader stories. Shows only stories the owner has published from /admin/stories. Until there
 * are any, visitors see only the testimony box, never invented reviews.
 */
export function StoriesSection({ stories }: { stories: PublishedStory[] }) {
  return (
    <section id="stories" aria-labelledby="stories-title" className="light relative bg-surface py-20 text-fg sm:py-28">
      <Container>
        <SectionHeading id="stories-title" eyebrow="Reader stories" title="In readers’ own words." />

        {stories.length > 0 ? (
          <>
            <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <li key={story.id} data-reveal>
                  <figure className="glass flex h-full flex-col rounded-3xl p-7">
                    <Quote className="h-6 w-6 text-accent" aria-hidden />
                    <blockquote className="mt-4 flex-1 whitespace-pre-line text-base leading-relaxed text-fg/85">
                      {story.quote}
                    </blockquote>
                    <figcaption className="mt-6 text-sm">
                      <span className="font-semibold text-fg">{story.name}</span>
                      {story.context && <span className="block text-fg/70">{story.context}</span>}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
            <ShareStoryForm className="mt-10" />
          </>
        ) : (
          <>
            <p className="mt-6 max-w-xl text-base text-fg/70">
              No testimonies here yet. If one of our guides helped you, we would love to hear how.
            </p>
            <ShareStoryForm className="mt-8" />
          </>
        )}
      </Container>
    </section>
  );
}
