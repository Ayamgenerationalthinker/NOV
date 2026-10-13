'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/**
 * Scroll motion for the homepage, switched on by data attributes so the sections themselves
 * can stay server-rendered:
 *
 *   data-reveal        fades and rises into place when scrolled into view (staggered in groups)
 *   data-parallax="n"  drifts by n% of its own height as it crosses the screen
 *   data-grow-line     a line that draws itself as its parent scrolls past
 *   data-scroll-progress  the reading-progress line this component renders itself
 *
 * Nothing here runs for visitors who ask for reduced motion: content is simply visible.
 */
export function HomeMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    media.add('(prefers-reduced-motion: no-preference)', () => {
      // Reveals use an IntersectionObserver rather than scroll positions, so they stay correct
      // when the page changes height (the hero growing, the shop being filtered).
      const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      gsap.set(reveals, { opacity: 0, y: 28 });
      const observer = new IntersectionObserver(
        (entries) => {
          const entered = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
          if (entered.length === 0) return;
          entered.forEach((el) => observer.unobserve(el));
          gsap.to(entered, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09, overwrite: true });
        },
        { rootMargin: '0px 0px -8% 0px' },
      );
      reveals.forEach((el) => observer.observe(el));

      // Scrubbed effects below do depend on positions: re-measure whenever the page height changes.
      let pending = 0;
      const resize = new ResizeObserver(() => {
        window.clearTimeout(pending);
        pending = window.setTimeout(() => ScrollTrigger.refresh(), 200);
      });
      resize.observe(document.body);

      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const amount = Number(el.dataset.parallax) || 10;
        gsap.fromTo(
          el,
          { yPercent: amount },
          { yPercent: -amount, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
      });

      // The thin line across the top of the screen fills as the page is read.
      const bar = document.querySelector<HTMLElement>('[data-scroll-progress]');
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 } },
        );
      }

      gsap.utils.toArray<HTMLElement>('[data-grow-line]').forEach((el) => {
        gsap.fromTo(
          el,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top',
            scrollTrigger: { trigger: el.parentElement, start: 'top 75%', end: 'bottom 60%', scrub: true },
          },
        );
      });

      return () => {
        observer.disconnect();
        resize.disconnect();
        window.clearTimeout(pending);
        gsap.set(reveals, { clearProps: 'opacity,transform' });
      };
    });

    // Smooth wheel scrolling for mouse users. Touch screens keep their native feel.
    media.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
      const lenis = new Lenis({ duration: 1.1, anchors: { offset: -72 } });
      lenis.on('scroll', ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      return () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });

    return () => media.revert();
  }, []);

  return (
    <div
      aria-hidden
      data-scroll-progress
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-[#60a5fa] to-white"
    />
  );
}
