'use client';

import * as React from 'react';
import { Quote } from 'lucide-react';
import type { PublishedStory } from './stories-section';

/** Longer testimonies start folded to four lines so the cards in the row stay the same size. */
const FOLD_AFTER_CHARS = 140;

/** One published testimony: a compact card in the sideways row. */
export function StoryCard({ story }: { story: PublishedStory }) {
  const [open, setOpen] = React.useState(false);
  const foldable = story.quote.length > FOLD_AFTER_CHARS;

  return (
    <li className="w-72 shrink-0 snap-start sm:w-[380px]">
      <figure className="rounded-3xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(0,22,80,0.04)]">
        <Quote className="h-5 w-5 text-brand" aria-hidden />
        <blockquote className={`mt-2 whitespace-pre-line text-base leading-relaxed text-ink ${foldable && !open ? 'line-clamp-4' : ''}`}>
          {story.quote}
        </blockquote>
        {foldable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1 min-h-11 text-sm font-semibold text-brand-hover underline underline-offset-4"
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
        <figcaption className="mt-3 border-t border-line pt-3">
          <span className="block text-sm font-bold text-ink">{story.name}</span>
          {story.context && <span className="block text-sm text-ink-soft">{story.context}</span>}
        </figcaption>
      </figure>
    </li>
  );
}
