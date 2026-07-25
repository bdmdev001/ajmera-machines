'use client';

import { useEffect, useRef, useState } from 'react';
import { cldUrl, cldSrcSet, type ImageRef } from '@/lib/images';

interface Props {
  /** Ordered background images cross-faded in place. */
  slides: ImageRef[];
  /** Extra class on the root — used to toggle the desktop vs mobile instance. */
  className?: string;
  /** When true, slides[0] is the eager, high-priority LCP element. Set this on
   *  the visible-on-first-paint instance only (the desktop background); the
   *  mobile slider sits below the copy, so it stays fully lazy. */
  priority?: boolean;
  /** Auto-advance delay between slides (ms). */
  intervalMs?: number;
  /** Responsive widths generated for each slide's srcSet. */
  widths?: number[];
  /** <img sizes> hint — the slider is full-bleed in every layout. */
  sizes?: string;
}

/**
 * Full-bleed background carousel for the homepage hero. Every slide is a real
 * <img> stacked in the same box and cross-faded via opacity.
 *
 * Two instances are mounted (see page.tsx) so desktop and tablet/mobile can show
 * DIFFERENT image sets: CSS toggles which is displayed per breakpoint. Only the
 * `priority` (desktop) instance renders its first slide eagerly at high priority
 * so it stays the LCP element; the mobile instance is fully lazy since it lives
 * below the copy. Auto-advance pauses when the tab is hidden and is disabled
 * under prefers-reduced-motion. Dots are only revealed (and interactive) in the
 * stacked mobile/tablet layout.
 */
export default function HeroSlider({
  slides,
  className,
  priority = false,
  intervalMs = 5500,
  widths = [640, 960, 1280, 1600],
  sizes = '100vw',
}: Props) {
  const imgs = slides.filter(Boolean);
  const count = imgs.length;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const step = (dir: number) => setActive((a) => (a + dir + count) % count);

  // Respect prefers-reduced-motion: no auto-advance, no cross-fade churn.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const onChange = () => { reduced.current = mq.matches; };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Pause the rotation while the tab is backgrounded (saves work + avoids a jump
  // through several slides the moment the user returns).
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Advance on a timer that restarts whenever `active` changes — so a manual dot
  // press also resets the dwell time on the newly selected slide.
  useEffect(() => {
    if (reduced.current || paused || count <= 1) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % count), intervalMs);
    return () => clearTimeout(t);
  }, [active, paused, count, intervalMs]);

  // Pointer-based swipe/drag — one gesture surface for mouse (desktop) and touch
  // (tablet/mobile). Because the desktop slider sits BEHIND the hero copy, we
  // listen on the whole `.hero` section (falling back to our own root), and each
  // mounted instance only reacts while it is the one visible at this breakpoint
  // (the other is display:none). Gestures that start on an interactive control —
  // CTAs, the finder, the dots — are ignored so nothing is hijacked.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || count <= 1) return;
    const surface: HTMLElement = root.closest('.hero') ?? root;

    let sx = 0, sy = 0, tracking = false, decided = false, horizontal = false;

    const guarded = (t: EventTarget | null) =>
      t instanceof Element
      && !!t.closest('a,button,input,select,textarea,label,[role="combobox"],.hero-slider__dots,.hero__finder-wrap');

    const onDown = (e: PointerEvent) => {
      // Only the instance shown at this breakpoint owns the gesture.
      if (getComputedStyle(root).display === 'none') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (guarded(e.target)) return;
      sx = e.clientX; sy = e.clientY;
      tracking = true; decided = false; horizontal = false;
      setPaused(true); // hold auto-advance while the finger/mouse is down
    };
    const onMove = (e: PointerEvent) => {
      if (!tracking) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
        if (horizontal) { try { surface.setPointerCapture(e.pointerId); } catch { /* noop */ } }
      }
      if (horizontal) e.preventDefault(); // suppress text selection / native pan
    };
    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      setPaused(document.hidden);
      if (horizontal && Math.abs(e.clientX - sx) > 45) step(e.clientX < sx ? 1 : -1);
    };

    surface.addEventListener('pointerdown', onDown);
    surface.addEventListener('pointermove', onMove, { passive: false });
    surface.addEventListener('pointerup', onUp);
    surface.addEventListener('pointercancel', onUp);
    return () => {
      surface.removeEventListener('pointerdown', onDown);
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerup', onUp);
      surface.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  if (count === 0) return null;

  return (
    <div ref={rootRef} className={`hero-slider${className ? ` ${className}` : ''}`}>
      <div className="hero-slider__stage" aria-hidden="true">
        {imgs.map((ref, i) => {
          const lcp = priority && i === 0;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className="hero-slider__img"
              src={cldUrl(ref, { width: 1280 })}
              srcSet={cldSrcSet(ref, widths)}
              sizes={sizes}
              alt=""
              data-active={i === active ? '' : undefined}
              fetchPriority={lcp ? 'high' : 'auto'}
              loading={lcp ? 'eager' : 'lazy'}
              decoding="async"
            />
          );
        })}
      </div>

      {count > 1 && (
        <div className="hero-slider__dots" role="tablist" aria-label="Hero image slides">
          {imgs.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show hero image ${i + 1} of ${count}`}
              className={`hero-slider__dot${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
