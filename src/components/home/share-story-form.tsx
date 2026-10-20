'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ghostButton, primaryButton } from './primitives';

const field =
  'mt-1.5 w-full rounded-2xl border border-fg/15 bg-fg/[0.04] px-4 py-3 text-base text-fg placeholder:text-fg/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';
const label = 'block text-left text-sm font-medium text-fg/80';

/** "Share your story" button that opens a short form. Stories wait for the owner to publish them. */
export function ShareStoryForm({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'We could not send your story. Please try again.');
      setStatus('sent');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className={cn('glass mx-auto max-w-xl rounded-3xl px-6 py-8 text-center', className)}>
        <CheckCircle2 className="mx-auto h-8 w-8 text-accent" aria-hidden />
        <p className="mt-3 text-lg font-semibold text-fg">Thank you for sharing.</p>
        <p className="mt-1 text-sm text-fg/70">We read every story. Yours will appear here once we have reviewed it.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(ghostButton, className)}>
        <PenLine className="h-4 w-4" aria-hidden /> Share your story
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn('glass mx-auto max-w-xl space-y-4 rounded-3xl p-6 sm:p-8', className)}>
      <p className="text-left text-lg font-semibold text-fg">Share your story</p>
      <div>
        <label htmlFor="story-name" className={label}>
          Your name
        </label>
        <input id="story-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className={field} />
      </div>
      <div>
        <label htmlFor="story-context" className={label}>
          What did you buy? <span className="font-normal text-fg/50">(optional)</span>
        </label>
        <input id="story-context" name="context" maxLength={120} placeholder="e.g. Freelancing Starter Guide" className={field} />
      </div>
      <div>
        <label htmlFor="story-quote" className={label}>
          Your story
        </label>
        <textarea
          id="story-quote"
          name="quote"
          required
          minLength={20}
          maxLength={1500}
          rows={5}
          placeholder="How did it help you?"
          className={cn(field, 'resize-y')}
        />
      </div>
      <div>
        <label htmlFor="story-email" className={label}>
          Email <span className="font-normal text-fg/50">(optional, never shown)</span>
        </label>
        <input id="story-email" name="email" type="email" maxLength={160} autoComplete="email" className={field} />
      </div>
      {/* Left empty by people; bots that fill every field are ignored. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {error && (
        <p role="alert" className="text-left text-sm text-red-600">
          {error}
        </p>
      )}

      <p className="text-left text-xs text-fg/60">By sending this you agree we may show your name and story on this website.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className={ghostButton}>
          Cancel
        </button>
        <button type="submit" disabled={status === 'sending'} className={cn(primaryButton, 'disabled:opacity-60')}>
          {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send story
        </button>
      </div>
    </form>
  );
}
