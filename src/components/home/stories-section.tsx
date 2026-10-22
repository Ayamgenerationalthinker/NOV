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
            <SectionHeading id="stories-title" eyebrow="Reader stories" title="In readers’ own words." />
            {/* One row of compact cards that scrolls sideways when there are more than fit. */}
            <ul className="-mx-4 mt-8 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:mt-10 sm:px-0 [scrollbar-width:thin]">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </ul>
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
