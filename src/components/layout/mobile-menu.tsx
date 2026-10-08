'use client';

import { useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';

/**
 * Phone menu. A native disclosure, so it opens without JavaScript; with it, the menu also
 * closes when a link is chosen, on Escape, and on a tap anywhere else.
 */
export function MobileMenu({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !menu.open) return;
      menu.open = false;
      menu.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="group relative lg:hidden">
      <summary
        aria-label="Menu"
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-cream hover:bg-cream/10 focus-visible:outline-2 focus-visible:outline-brass [&::-webkit-details-marker]:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </summary>
      <nav
        aria-label="Main"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a') && ref.current) ref.current.open = false;
        }}
        className="absolute right-0 top-14 flex w-56 flex-col gap-1 rounded-3xl border border-cream/15 bg-forest/95 p-3 shadow-2xl backdrop-blur-xl"
      >
        {children}
      </nav>
    </details>
  );
}
