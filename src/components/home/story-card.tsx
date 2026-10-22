'use client';

import * as React from 'react';
import { Quote } from 'lucide-react';
import type { PublishedStory } from './stories-section';

/** Longer testimonies start folded to three lines so the cards stay as compact as the step cards. */
const FOLD_AFTER_CHARS = 160;

/**
 * One published testimony, shaped like the "How it works" step cards: a round badge beside a
 * short card. The section is light, so the card names the site's dark navy and blue directly.
 */
export function StoryCard({ story }: { story: PublishedStory }) {
  const [open, setOpen] = React.useState(false);
  const foldable = story.quote.length > FOLD_AFTER_CHARS;

  return (
    <li data-reveal className="relative flex gap-4 sm:gap-5">
      <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0b5cff]/50 bg-surface text-[#0b5cff] sm:h-12 sm:w-12">
        <Quote className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
      </span>
      <figure className="min-w-0 flex-1 rounded-3xl border border-white/10 bg-gradient-to-br from-[#021f6b] to-[#001650] p-5 text-white shadow-[0_14px_36px_-18px_rgba(11,92,255,0.55)] sm:p-6">
        <figcaption>
          <span className="block text-lg font-semibold tracking-tight sm:text-xl">{story.name}</span>
          {story.context && <span className="block text-sm text-[#9dbfff]">{story.context}</span>}
        </figcaption>
        <blockquote
          className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85 sm:text-base ${foldable && !open ? 'line-clamp-3' : ''}`}
        >
          {story.quote}
        </blockquote>
        {foldable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 text-sm font-semibold text-[#4d8dff] hover:text-white"
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
      </figure>
    </li>
  );
}
