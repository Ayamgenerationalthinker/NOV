'use client';

import * as React from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichLine } from './rich-line';

/** A line such as "What You Will Learn" or "Who Is This Guide For?" reads as a sub-heading, not a point. */
function isHeading(item: string): boolean {
  const text = item.trim();
  return /[:?]$/.test(text) && text.length <= 60;
}

/**
 * The "What you get" list: the first few points, then "Show all" for the rest. Every point is
 * in the HTML from the start, so it stays searchable and readable without JS.
 */
export function ExpandableList({ items, previewCount = 5 }: { items: string[]; previewCount?: number }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const isLong = items.length > previewCount + 1;

  return (
    <div>
      <ul id={id} className="space-y-2.5">
        {items.map((item, idx) => {
          const hidden = isLong && !open && idx >= previewCount;
          return isHeading(item) ? (
            <li key={idx} className={cn('pt-2 text-sm font-semibold text-white first:pt-0', hidden && 'hidden')}>
              {item.trim().replace(/:$/, '')}
            </li>
          ) : (
            <li key={idx} className={cn('flex items-start gap-3 text-[15px] leading-relaxed text-stone-300', hidden && 'hidden')}>
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
              <span className="min-w-0 break-words">
                <RichLine text={item} />
              </span>
            </li>
          );
        })}
      </ul>
      {isLong && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-amber-300 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          {open ? 'Show less' : `Show all ${items.length}`}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      )}
    </div>
  );
}
