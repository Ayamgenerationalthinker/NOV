'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/track';
import { primaryButton } from './primitives';

const field =
  'min-h-12 w-full rounded-2xl border border-line-strong bg-card px-3.5 py-3 text-base text-ink placeholder:text-ink-soft';

/** Testimony box shown straight on the page: write it, add name and email, send. The owner publishes it later. */
export function ShareStoryForm({ className }: { className?: string }) {
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
      if (!res.ok) throw new Error(data?.error || 'We could not send your testimony. Please try again.');
      trackEvent('story');
      setStatus('sent');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className={cn('max-w-xl rounded-3xl border border-line bg-card px-6 py-8 text-center', className)}>
        <CheckCircle2 className="mx-auto h-8 w-8 text-ok" aria-hidden />
        <p className="mt-3 text-lg font-bold text-ink">Thank you for sharing.</p>
        <p className="mt-1 text-sm text-ink-soft">Your testimony will appear here once we have reviewed it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn('max-w-xl space-y-3 rounded-3xl border border-line bg-card p-5 text-left sm:p-6', className)}>
      <label htmlFor="story-quote" className="sr-only">
        Your testimony
      </label>
      <textarea
        id="story-quote"
        name="quote"
        required
        minLength={20}
        maxLength={1500}
        rows={4}
        placeholder="Share your testimony…"
        className={cn(field, 'resize-y')}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="story-name" className="sr-only">
          Your name
        </label>
        <input id="story-name" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Your name" className={field} />
        <label htmlFor="story-email" className="sr-only">
          Your email
        </label>
        <input
          id="story-email"
          name="email"
          type="email"
          required
          maxLength={160}
          autoComplete="email"
          placeholder="Your email"
          className={field}
        />
      </div>
      {/* Left empty by people; bots that fill every field are ignored. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Your email is never shown.</p>
        <button type="submit" disabled={status === 'sending'} className={primaryButton}>
          {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          Share
        </button>
      </div>
    </form>
  );
}
