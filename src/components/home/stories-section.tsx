import { Container } from '@/components/ui/container';
import { SectionHeading } from './primitives';
import { ShareStoryForm } from './share-story-form';
import { StoryCard } from './story-card';

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
        {stories.length > 0 ? (
          <>
            {/* Laid out like the "How it works" steps: heading on the left on desktop, cards on the right. */}
            <div className="grid gap-8 sm:gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
              <SectionHeading
                id="stories-title"
                eyebrow="Reader stories"
                title="In readers’ own words."
                className="lg:sticky lg:top-28 lg:self-start"
              />
              <ol className="relative space-y-4 sm:space-y-6">
                <span aria-hidden className="absolute bottom-6 left-5 top-6 w-px bg-fg/10 sm:left-6" />
                {stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </ol>
            </div>
            <ShareStoryForm className="mt-12" />
          </>
        ) : (
          <>
            <SectionHeading id="stories-title" eyebrow="Reader stories" title="In readers’ own words." />
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
