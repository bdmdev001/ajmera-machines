'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { cldUrl, cldSrcSet, type ImageRef } from '@/lib/images';

/** One product's slide: its image plus the canonical detail URL + title so the
 *  link always resolves to the exact product being displayed. Built on the
 *  server from real inventory (never hardcoded). */
export interface CollageSlide {
  image: ImageRef;
  href: string;
  title: string;
}

interface Props {
  /** Ordered pool of real product slides (mixed categories). Split across the
   *  three collage slots so each one rotates through a distinct set. */
  slides: CollageSlide[];
}

/** Per-slot geometry + timing. The three slots keep the exact collage layout
 *  (one tall image on the left, two stacked squares on the right) but each
 *  rotates on its own cadence so the composition feels alive, never in lockstep.
 *  Intervals are mutually prime-ish so the slots drift out of phase over time. */
const SLOTS = [
  { key: 'lead', interval: 4300, delay: 200, width: 760 },
  { key: 'top', interval: 5300, delay: 1500, width: 420 },
  { key: 'bottom', interval: 6100, delay: 3100, width: 420 },
] as const;

/** Round-robin the pool into `n` decks so consecutive slots never draw the same
 *  product and each deck keeps the category variety of the source ordering. */
function deal<T>(items: T[], n: number): T[][] {
  const decks: T[][] = Array.from({ length: n }, () => []);
  items.forEach((it, i) => decks[i % n].push(it));
  return decks;
}

/**
 * Animated "Our Story" collage. Client-only so it can auto-advance; the products
 * themselves are loaded on the server and passed in. Each of the three slots
 * cross-dissolves (with a gentle Ken-Burns drift) through its own deck, and the
 * whole cell is a link to the product currently shown — the href updates in lock
 * step with the visible image, so a click always opens the exact product on
 * screen. Autoplay pauses on hover (desktop) and while the tab is hidden, honours
 * prefers-reduced-motion, and a horizontal swipe advances every slot (touch).
 */
export default function StoryCollage({ slides }: Props) {
  const pool = useMemo(() => slides.filter((s) => s && s.image), [slides]);
  const decks = useMemo(() => deal(pool, SLOTS.length), [pool]);
  const reduced = useReducedMotion();

  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Slots register their imperative `advance` here; a swipe calls them all from
  // the pointer handler (never from an effect), keeping each slot self-managing.
  const advancers = useRef(new Set<() => void>());
  const register = useCallback((fn: () => void) => {
    advancers.current.add(fn);
    return () => { advancers.current.delete(fn); };
  }, []);

  // Pause while the tab is backgrounded (avoids a burst of transitions on return).
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Horizontal swipe over the collage advances all slots (mobile/tablet + mouse),
  // and suppresses the click that a drag would otherwise fire on the slot link so
  // a swipe never accidentally navigates to a product.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let sx = 0, sy = 0, tracking = false, decided = false, horizontal = false, swiped = false;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      sx = e.clientX; sy = e.clientY;
      tracking = true; decided = false; horizontal = false; swiped = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!tracking) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        decided = true;
        horizontal = Math.abs(dx) > Math.abs(dy);
      }
      if (horizontal) { e.preventDefault(); swiped = true; }
    };
    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;
      if (horizontal && Math.abs(e.clientX - sx) > 45) advancers.current.forEach((fn) => fn());
    };
    // Fires right after a drag's pointerup — cancel the synthetic click so the
    // link doesn't navigate when the user only meant to swipe.
    const onClick = (e: MouseEvent) => {
      if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; }
    };

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove, { passive: false });
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('click', onClick, true);
    return () => {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('click', onClick, true);
    };
  }, []);

  if (pool.length === 0) return null;

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'stretch', touchAction: 'pan-y' }}
    >
      <Slot
        slides={decks[0]}
        cfg={SLOTS[0]}
        paused={paused}
        reduced={!!reduced}
        register={register}
        eager
        style={{ gridRow: '1 / span 2', minHeight: 220, boxShadow: 'var(--shadow-md)' }}
      />
      <Slot
        slides={decks[1]}
        cfg={SLOTS[1]}
        paused={paused}
        reduced={!!reduced}
        register={register}
        style={{ aspectRatio: '1 / 1', boxShadow: 'var(--shadow-sm)' }}
      />
      <Slot
        slides={decks[2]}
        cfg={SLOTS[2]}
        paused={paused}
        reduced={!!reduced}
        register={register}
        style={{ aspectRatio: '1 / 1', boxShadow: 'var(--shadow-sm)' }}
      />
    </div>
  );
}

interface SlotProps {
  slides: CollageSlide[];
  cfg: (typeof SLOTS)[number];
  paused: boolean;
  reduced: boolean;
  /** Register this slot's imperative advance so a parent swipe can trigger it. */
  register: (fn: () => void) => () => void;
  eager?: boolean;
  style?: React.CSSProperties;
}

/** One collage cell: a fixed-size, rounded, clipped box whose image cross-fades
 *  through its own deck. A single link overlay always points at the product of
 *  the CURRENT index, so the destination stays in sync with the visible image.
 *  Layout (radius, border, shadow, aspect) is preserved so the collage looks
 *  identical to the static version between transitions. */
function Slot({ slides, cfg, paused, reduced, register, eager, style }: SlotProps) {
  const count = slides.length;
  const [i, setI] = useState(0);

  const advance = useCallback(() => {
    if (count > 1) setI((n) => (n + 1) % count);
  }, [count]);

  // Independent auto-advance timer, restarted on each change so a swipe also
  // resets this slot's dwell. Staggered `delay` desyncs the three slots.
  useEffect(() => {
    if (reduced || paused || count <= 1) return;
    const t = setTimeout(advance, cfg.interval + cfg.delay);
    return () => clearTimeout(t);
  }, [i, paused, reduced, count, cfg.interval, cfg.delay, advance]);

  // Expose the advance fn to the parent's swipe handler for the lifetime of the slot.
  useEffect(() => register(advance), [register, advance]);

  if (count === 0) return null;

  const current = slides[i % count];
  const next = slides[(i + 1) % count];
  const dur = reduced ? 0 : 1.1;

  return (
    <Link
      href={current.href}
      aria-label={`View ${current.title}`}
      className="story-collage__slot"
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        background: '#eef1f4',
        ...style,
      }}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={i}
          src={cldUrl(current.image, { width: cfg.width })}
          srcSet={cldSrcSet(current.image, [cfg.width, cfg.width * 2])}
          sizes={`${cfg.width}px`}
          alt=""
          aria-hidden
          loading={eager && i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          initial={{ opacity: 0, scale: 1.08, x: 12 }}
          animate={{ opacity: 1, scale: 1.04, x: 0 }}
          exit={{ opacity: 0, scale: 1.04, x: -12 }}
          transition={{ duration: dur, ease: [0.4, 0, 0.2, 1] }}
          className="story-collage__img"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'opacity, transform' }}
        />
      </AnimatePresence>

      {/* Subtle "clickable" affordance — a tint + arrow chip revealed on hover. */}
      <span aria-hidden className="story-collage__scrim" />
      <span aria-hidden className="story-collage__cue">
        <ArrowUpRight size={16} />
      </span>

      {/* Preload the next image so its cross-fade is instant (no layout impact). */}
      {count > 1 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cldUrl(next.image, { width: cfg.width })} alt="" aria-hidden loading="eager" decoding="async" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
      )}
    </Link>
  );
}
