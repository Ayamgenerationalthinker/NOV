'use client';

import * as React from 'react';
import { Quote } from 'lucide-react';
import type { PublishedStory } from './stories-section';

/** Longer testimonies start folded to four lines so the cards in the row stay the same size. */
const FOLD_AFTER_CHARS = 140;

/**
 * One published testimony: a compact card in the sideways row. The section is light, so the card
 * names the site's dark navy and blue directly.
 */
export function StoryCard({ story }: { story: PublishedStory }) {
  const [open, setOpen] = React.useState(false);
  const foldable = story.quote.length > FOLD_AFTER_CHARS;

  return (
    <li data-reveal className="w-64 shrink-0 snap-start sm:w-72">
      <figure className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#021f6b] to-[#001650] p-4 text-white shadow-[0_14px_36px_-18px_rgba(11,92,255,0.55)] sm:p-5">
        <Quote className="h-4 w-4 text-[#4d8dff]" aria-hidden />
        <blockquote
          className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85 ${foldable && !open ? 'line-clamp-4' : ''}`}
        >
          {story.quote}
        </blockquote>
        {foldable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1 text-sm font-semibold text-[#4d8dff] hover:text-white"
          >
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
        <figcaption className="mt-3 border-t border-white/10 pt-3">
          <span className="block text-sm font-semibold">{story.name}</span>
          {story.context && <span className="block text-xs text-[#9dbfff]">{story.context}</span>}
        </figcaption>
      </figure>
    </li>
  );
}
