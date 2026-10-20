import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TestimonialService } from '@/services/testimonial/testimonial.service';

export const dynamic = 'force-dynamic';

const storySchema = z.object({
  name: z.string().trim().min(2, 'Please add your name.').max(80),
  email: z.string().trim().email('Please add a valid email address.').max(160),
  context: z.string().trim().max(120).optional(),
  quote: z.string().trim().min(20, 'Please write at least a sentence or two.').max(1500, 'Please keep it under 1500 characters.'),
  /** Hidden field people never see; bots that fill every input get a silent success. */
  website: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = storySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Please check your story.' }, { status: 400 });
    }

    const { website, ...story } = parsed.data;
    if (!website) await TestimonialService.submit(story);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Story submission error:', error);
    return NextResponse.json({ error: 'We could not send your testimony. Please try again.' }, { status: 500 });
  }
}
