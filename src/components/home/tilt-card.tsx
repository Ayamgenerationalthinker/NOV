'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Largest tilt in degrees. */
  max?: number;
}

/** Leans towards the mouse in 3D, with a soft highlight that follows it. Mouse only. */
export function TiltCard({ max = 7, className, children, ...props }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = el.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    el.style.transitionDuration = '120ms';
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max * 2}deg) rotateY(${(x - 0.5) * max * 2}deg) translateZ(0)`;
    el.style.setProperty('--glare-x', `${x * 100}%`);
    el.style.setProperty('--glare-y', `${y * 100}%`);
    el.style.setProperty('--glare', '1');
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transitionDuration = '700ms';
    el.style.transform = '';
    el.style.setProperty('--glare', '0');
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('relative transition-transform ease-out will-change-transform [transform-style:preserve-3d]', className)}
      {...props}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[var(--glare,0)] transition-opacity duration-500 [background:radial-gradient(420px_circle_at_var(--glare-x,50%)_var(--glare-y,50%),rgba(255,255,255,0.16),transparent_60%)]"
      />
    </div>
  );
}
