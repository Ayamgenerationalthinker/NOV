'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichLine } from './rich-line';

/**
 * Long text shown as a short preview with "Read more". Short text is shown in full with no
 * button. The full text is always in the HTML, so it stays searchable and readable without JS.
 */
export function ExpandableText({ text, previewChars = 280, className }: { text: string; previewChars?: number; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const isLong = text.length > previewChars;

  return (
    <div className={className}>
      <div
        id={id}
        className={cn(
          'relative whitespace-pre-line break-words text-[15px] leading-relaxed text-stone-300',
          isLong && !open && 'max-h-32 overflow-hidden'
        )}
      >
        <RichLine text={text} />
        {isLong && !open && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-stone-950 to-transparent" />
        )}
      </div>
      {isLong && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-amber-300 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          {open ? 'Show less' : 'Read more'}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      )}
    </div>
  );
}
