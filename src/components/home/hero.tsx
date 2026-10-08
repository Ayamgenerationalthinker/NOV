'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, ChevronDown } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Container } from '@/components/ui/container';
import { GROWTH_STAGES } from '@/content/home';
import { cn } from '@/lib/utils';
import { Eyebrow, ghostButton, primaryButton } from './primitives';
import { StatsStrip } from './stats-strip';
import type { ArtBand } from './hero-scene';
import { TreePoster } from './tree-poster';
import { useInView, useSceneMode } from './use-scene-mode';

// Three.js is only downloaded on devices that will actually show the 3D scene.
const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false });

/** Height of the floating navbar plus a little air, in px. */
const NAV_CLEARANCE = 76;

interface HeroProps {
  headline: string;
  subline: string;
}

export function Hero({ headline, subline }: HeroProps) {
  const mode = useSceneMode();
  const is3d = mode === '3d';
  const { ref: section, inView } = useInView<HTMLElement>();
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const stage3d = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const band = useRef<ArtBand | null>(null);

  // Below the desktop layout the artwork sits above the text. Measure the room between the
  // navbar and the text so the tree is framed inside it, whatever the phone's height.
  useEffect(() => {
    const box = stage3d.current;
    const text = copy.current;
    if (!box || !text) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const measure = () => {
      if (desktop.matches) {
        band.current = null;
        box.style.removeProperty('--art-space');
        return;
      }
      const outer = box.getBoundingClientRect();
      const bottom = Math.max(NAV_CLEARANCE + 110,text.getBoundingClientRect().top - outer.top - 8);
      band.current = { top: NAV_CLEARANCE / outer.height, bottom: bottom / outer.height };
      box.style.setProperty('--art-space', `${bottom - NAV_CLEARANCE}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  // Scrolling through the tall hero scrubs the scene and moves the caption along.
  useEffect(() => {
    const el = section.current;
    if (!is3d || !el) return;
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress;
        setStage(self.progress < 0.3 ? 0 : self.progress < 0.62 ? 1 : 2);
      },
    });
    return () => trigger.kill();
  }, [is3d, section]);

  const words = headline.split(' ');

  return (
    <>
      <section
        ref={section}
        aria-labelledby="hero-title"
        className={cn('relative', is3d && 'h-[320svh]')}
      >
        <div
          ref={stage3d}
          className={cn('flex flex-col overflow-hidden', is3d ? 'sticky top-0 h-svh' : 'relative min-h-[92svh] lg:min-h-svh')}
        >
          {/* Backdrop: forest fading to charcoal, with a soft brass glow behind the tree */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(212,162,76,0.16),transparent_70%),linear-gradient(to_bottom,#0b1f17,#0b1f17_55%,#14181a)] lg:bg-[radial-gradient(45%_55%_at_72%_45%,rgba(212,162,76,0.16),transparent_70%),linear-gradient(to_bottom,#0b1f17,#0b1f17_55%,#14181a)]"
          />

          <TreePoster
            className={cn(
              'absolute inset-x-0 top-[4.75rem] mx-auto h-[var(--art-space,40%)] w-full transition-opacity duration-700 ease-out lg:inset-x-auto lg:right-[4%] lg:top-[8%] lg:h-[84%] lg:w-[52%]',
              // Shown only once we know this device is not getting the 3D scene, so the grown
              // tree never flashes up before the seed.
              mode !== 'static' && 'opacity-0',
            )}
          />
          {is3d && (
            <div className={cn('absolute inset-0 transition-opacity duration-700 ease-out', !sceneReady && 'opacity-0')}>
              <HeroScene progress={progress} band={band} active={inView} onReady={() => setSceneReady(true)} />
            </div>
          )}

          {/* Keeps the text readable where it overlaps the artwork on phones */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-forest via-forest/85 to-transparent lg:hidden" />

          <Container className="relative flex flex-1 flex-col justify-end pb-8 pt-52 lg:justify-center lg:pt-24 lg:pb-36">
            <div ref={copy} className="max-w-xl">
              <Eyebrow>Seed · Growth · Harvest</Eyebrow>
              <h1
                id="hero-title"
                className="mt-4 text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-cream sm:text-5xl lg:text-6xl"
              >
                {words.map((word, i) => (
                  <Fragment key={i}>
                    <span className="word-rise" style={{ animationDelay: `${i * 70}ms` }}>
                      {word}
                    </span>{' '}
                  </Fragment>
                ))}
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-cream/80 sm:text-lg">{subline}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#shop" className={primaryButton}>
                  Browse ebooks <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <a href="#how-it-works" className={ghostButton}>
                  How it works
                </a>
              </div>

              {/* The three stages. With 3D on, the one matching the scroll position lights up. */}
              <ol className="mt-7 flex flex-wrap gap-2" aria-label="Growth stages">
                {GROWTH_STAGES.map((item, i) => {
                  const lit = !is3d || stage === i;
                  return (
                    <li
                      key={item.caption}
                      aria-current={is3d && stage === i ? 'step' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-700 ease-out sm:text-sm',
                        lit
                          ? 'border-brass/60 bg-brass/15 text-cream text-glow-brass'
                          : 'border-cream/15 bg-cream/5 text-cream/70',
                      )}
                    >
                      <span className="tabular-nums text-brass-200">0{i + 1}</span>
                      {item.caption}
                    </li>
                  );
                })}
              </ol>
            </div>
          </Container>

          <div className="absolute inset-x-0 bottom-6 hidden lg:block">
            <Container>
              <StatsStrip />
            </Container>
          </div>

          {is3d && (
            <p
              aria-hidden
              className={cn(
                'absolute bottom-28 right-8 hidden items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-cream/70 transition-opacity duration-700 lg:flex',
                stage > 0 && 'opacity-0',
              )}
            >
              Scroll to grow <ChevronDown className="h-4 w-4 motion-safe:animate-bounce" />
            </p>
          )}
        </div>
      </section>

      <div className="bg-charcoal pb-2 pt-4 lg:hidden">
        <Container>
          <StatsStrip />
        </Container>
      </div>
    </>
  );
}
