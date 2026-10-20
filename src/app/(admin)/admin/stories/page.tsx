import { TestimonialManagement } from '@/components/admin/testimonial-management';
import { TestimonialService } from '@/services/testimonial/testimonial.service';

export const dynamic = 'force-dynamic';

export default async function AdminStoriesPage() {
  const stories = await TestimonialService.getAll();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reader stories</h1>
        <p className="mt-1 text-sm text-stone-400">
          Stories readers send from the homepage wait here. Publish one to show it on the website.
        </p>
      </div>
      <TestimonialManagement
        stories={stories.map((story) => ({
          id: story.id,
          name: story.name,
          email: story.email,
          context: story.context,
          quote: story.quote,
          isPublished: story.isPublished,
          createdAt: story.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
