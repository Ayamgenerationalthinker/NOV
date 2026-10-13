'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** 'pending' until checked in the browser; then '3d' on capable devices, else 'static'. */
export type SceneMode = 'pending' | '3d' | 'static';

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

function detect(): Exclude<SceneMode, 'pending'> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  // The scrubbed hero pins one screenful; very short screens (a phone on its side) can't hold it.
  if (window.innerHeight < 620) return 'static';

  const nav = navigator as Navigator & NavigatorHints;
  if (nav.connection?.saveData) return 'static';
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return 'static';
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return 'static';

  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return 'static';
  } catch {
    return 'static';
  }
  return '3d';
}

let cached: Exclude<SceneMode, 'pending'> | null = null;
const subscribe = () => () => {};
const getSnapshot = (): SceneMode => (cached ??= detect());
const getServerSnapshot = (): SceneMode => 'pending';

/** Decides whether this device gets the WebGL scenes or the static artwork. */
export function useSceneMode(): SceneMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True while the element is on (or near) the screen; used to pause off-screen canvases. */
export function useInView<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}
