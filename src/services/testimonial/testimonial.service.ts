import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { EmailService } from '@/services/email/email.service';

export interface SubmitTestimonialParams {
  name: string;
  email?: string;
  context?: string;
  quote: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export class TestimonialService {
  /** Save a reader's story as unpublished and let the owner know it is waiting. */
  static async submit({ name, email, context, quote }: SubmitTestimonialParams) {
    const testimonial = await prisma.testimonial.create({
      data: { name, email: email || null, context: context || null, quote },
    });

    await EmailService.sendEmail({
      to: env.NEXT_PUBLIC_SUPPORT_EMAIL,
      subject: `New reader story from ${name}`,
      html: `<p><strong>${escapeHtml(name)}</strong>${context ? ` (${escapeHtml(context)})` : ''} sent a story:</p>
<blockquote>${escapeHtml(quote).replace(/\n/g, '<br>')}</blockquote>
<p>Publish it from <a href="${env.NEXT_PUBLIC_APP_URL}/admin/stories">${env.NEXT_PUBLIC_APP_URL}/admin/stories</a>.</p>`,
      text: `${name}${context ? ` (${context})` : ''} sent a story:\n\n${quote}\n\nPublish it from ${env.NEXT_PUBLIC_APP_URL}/admin/stories`,
    }).catch((err) => console.error('Story notification email failed:', err));

    return testimonial;
  }

  /** Published stories for the homepage, newest first. */
  static async getPublished(limit = 12) {
    return prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, name: true, context: true, quote: true },
    });
  }

  /** Every story for the owner: waiting ones first, then newest. */
  static async getAll() {
    return prisma.testimonial.findMany({
      orderBy: [{ isPublished: 'asc' }, { createdAt: 'desc' }],
    });
  }

  static async setPublished(id: string, isPublished: boolean) {
    return prisma.testimonial.update({
      where: { id },
      data: { isPublished, publishedAt: isPublished ? new Date() : null },
    });
  }

  static async remove(id: string) {
    await prisma.testimonial.delete({ where: { id } });
  }
}
