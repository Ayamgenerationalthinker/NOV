'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { primaryButton } from './primitives';

const field =
  'w-full rounded-2xl border border-fg/15 bg-fg/[0.04] px-4 py-3 text-base text-fg placeholder:text-fg/45 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30';

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
        <p className="mt-1 text-sm text-fg/70">Your testimony will appear here once we have reviewed it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn('glass mx-auto max-w-xl space-y-3 rounded-3xl p-5 text-left sm:p-6', className)}>
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
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg/60">Your email is never shown.</p>
        <button type="submit" disabled={status === 'sending'} className={cn(primaryButton, 'disabled:opacity-60')}>
          {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          Share
        </button>
      </div>
    </form>
  );
}
