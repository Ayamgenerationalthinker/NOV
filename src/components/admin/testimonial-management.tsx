'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail, MessageSquareQuote, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminStory {
  id: string;
  name: string;
  email: string | null;
  context: string | null;
  quote: string;
  isPublished: boolean;
  createdAt: string;
}

const FILTERS = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'published', label: 'Published' },
  { key: 'all', label: 'All' },
] as const;

type Filter = (typeof FILTERS)[number]['key'];

const EMPTY_TEXT: Record<Filter, string> = {
  waiting: 'No new stories waiting.',
  published: 'Nothing published yet.',
  all: 'No stories yet.',
};

export function TestimonialManagement({ stories }: { stories: AdminStory[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>('waiting');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const counts: Record<Filter, number> = {
    waiting: stories.filter((s) => !s.isPublished).length,
    published: stories.filter((s) => s.isPublished).length,
    all: stories.length,
  };
  const visible = stories.filter((s) => (filter === 'all' ? true : filter === 'published' ? s.isPublished : !s.isPublished));

  async function act(id: string, init: RequestInit, failMessage: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/testimonials/${id}`, init);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || failMessage);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const setPublished = (id: string, isPublished: boolean) =>
    act(
      id,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublished }) },
      'Could not update the story.'
    );

  const remove = (story: AdminStory) => {
    if (!window.confirm(`Delete the story from ${story.name}? This cannot be undone.`)) return;
    act(story.id, { method: 'DELETE' }, 'Could not delete the story.');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm',
              filter === key ? 'border-amber-300/50 bg-stone-800 text-white' : 'border-stone-800 text-stone-400 hover:text-white'
            )}
          >
            {label} <span className="text-stone-500">({counts[key]})</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 px-6 py-14 text-center">
          <MessageSquareQuote className="mx-auto h-8 w-8 text-stone-600" />
          <p className="mt-3 text-sm text-stone-400">{EMPTY_TEXT[filter]}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((story) => {
            const busy = busyId === story.id;
            return (
              <li key={story.id} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{story.name}</p>
                    {story.context && <p className="text-sm text-stone-400">{story.context}</p>}
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      story.isPublished ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
                    )}
                  >
                    {story.isPublished ? 'On the website' : 'Waiting'}
                  </span>
                </div>

                <blockquote className="mt-3 whitespace-pre-line text-sm leading-relaxed text-stone-200">{story.quote}</blockquote>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span>
                      {new Date(story.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {story.email && (
                      <a href={`mailto:${story.email}`} className="flex items-center gap-1 hover:text-stone-300">
                        <Mail className="h-3.5 w-3.5" /> {story.email}
                      </a>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(story)}
                      className="flex items-center gap-1.5 rounded-lg border border-stone-800 px-3 py-2 text-sm text-stone-400 hover:border-red-900 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPublished(story.id, !story.isPublished)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-50',
                        story.isPublished
                          ? 'border border-stone-700 text-stone-200 hover:bg-stone-800'
                          : 'bg-amber-300 text-stone-950 hover:bg-amber-200'
                      )}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : story.isPublished ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {story.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
