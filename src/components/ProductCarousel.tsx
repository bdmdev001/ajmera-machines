'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { IProduct } from '@/models/Product';
import ProductCard from './ProductCard';

interface Props {
  products: IProduct[];
  /** Corner badge passed straight through to the (unchanged) ProductCard. */
  badge?: { label: string; tone?: 'hot' | 'new' };
  /** Accessible name for the region and its controls, e.g. "Featured machines". */
  label: string;
  /** Rendered instead of the track when there are no products. */
  empty?: React.ReactNode;
  /** Autoplay interval; 0 disables it. */
  autoplayMs?: number;
}

/**
 * Responsive, dependency-free product carousel shared by the homepage
 * "Featured machines" and "Latest arrivals" sections, so both behave and look
 * identically. Cards are the existing ProductCard — unchanged.
 *
 * Built on native CSS scroll-snap (see .fcar__* in globals.css): the browser
 * gives us smooth transitions, momentum and touch/swipe for free, and cards per
 * view stay pure CSS — 4 desktop / 3 laptop / 2 tablet / 1 phone.
 *
 * On top of that:
 *  - infinite loop, by rendering three copies and silently re-centring once a
 *    scroll settles (see wrap() — the jump is one whole copy, so the content
 *    under the pointer is identical and the seam is invisible);
 *  - autoplay that pauses on hover, focus, touch, tab-hide and off-screen;
 *  - pagination dots alongside the existing prev/next buttons.
 *
 * Looping and autoplay only engage when the products actually overflow one
 * view. With fewer products than fit on screen there is nothing to scroll, and
 * cloning would put the same machine on screen twice — so it renders as a plain
 * row instead. The first render is always a single copy, which also keeps the
 * server HTML free of duplicate cards.
 */
export default function ProductCarousel({ products, badge, label, empty, autoplayMs = 4500 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const [perView, setPerView] = useState(4);
  const [looping, setLooping] = useState(false);
  const [page, setPage] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // Three independent reasons to hold autoplay, kept apart so releasing one
  // (say, refocusing the tab) can't override another (the pointer still hovering).
  const [interacting, setInteracting] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [onScreen, setOnScreen] = useState(true);

  // Layout metrics, measured from the DOM so CSS stays the single source of
  // truth for how many cards fit at each breakpoint.
  const metrics = useRef({ step: 0, setWidth: 0 });
  const centred = useRef('');

  const count = products.length;
  const pageCount = perView > 0 ? Math.max(1, Math.ceil(count / perView)) : 1;

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el || count === 0) return;
    const slides = el.children;
    const first = slides[0] as HTMLElement | undefined;
    if (!first) return;

    const gap = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const step = first.offsetWidth + gap;
    // Distance between copies, taken from the DOM when the clones exist.
    const second = slides[count] as HTMLElement | undefined;
    const setWidth = second ? second.offsetLeft - first.offsetLeft : step * count;
    metrics.current = { step, setWidth };

    const pv = Math.max(1, Math.round((el.clientWidth + gap) / step));
    setPerView(pv);
    setLooping(count > pv);
  }, [count]);

  useLayoutEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Once the clones are in the DOM, jump to the middle copy so there is a full
  // copy of slack in both directions. Layout effect ⇒ done before paint.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    if (!looping) { centred.current = ''; return; }
    // Keyed so a changed product list re-centres instead of being skipped.
    const key = `${count}`;
    if (centred.current === key) return;
    const { setWidth } = metrics.current;
    if (setWidth <= 0) return;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = setWidth;
    el.style.scrollBehavior = prev;
    centred.current = key;
  }, [looping, count]);

  /** Re-centre after a scroll settles, keeping the illusion of an endless track.
   *  Deliberately not done mid-scroll: assigning scrollLeft cancels an in-flight
   *  smooth scroll, which would show up as a stutter at the seam. */
  const wrap = useCallback(() => {
    const el = trackRef.current;
    const { setWidth } = metrics.current;
    if (!el || !looping || setWidth <= 0) return;
    const x = el.scrollLeft;
    let next = x;
    if (x < setWidth * 0.5) next = x + setWidth;
    else if (x >= setWidth * 1.5) next = x - setWidth;
    if (next === x) return;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto';
    el.scrollLeft = next;
    el.style.scrollBehavior = prev;
  }, [looping]);

  const syncIndicators = useCallback(() => {
    const el = trackRef.current;
    const { step } = metrics.current;
    if (!el || step <= 0) return;

    // Round to the nearest slide BEFORE wrapping. Taking the modulo on the raw
    // distance instead would break at the seam: the browser stores scrollLeft
    // at device-pixel precision, so landing a hair under one whole copy makes
    // `scrollLeft % setWidth` read as almost a full set — i.e. the last page —
    // when the track is really sitting on the first card.
    const slideIndex = Math.round(el.scrollLeft / step);
    const relative = looping ? ((slideIndex % count) + count) % count : slideIndex;
    setPage(Math.min(pageCount - 1, Math.max(0, Math.floor(relative / perView))));

    if (looping) {
      setCanPrev(true);
      setCanNext(true);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < maxScroll - 2);
  }, [looping, perView, pageCount, count]);

  // Scroll listener + settle detection (native `scrollend` where available).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncIndicators();

    let timer: ReturnType<typeof setTimeout>;
    const hasScrollEnd = 'onscrollend' in window;
    const onScroll = () => {
      syncIndicators();
      if (hasScrollEnd) return;
      clearTimeout(timer);
      timer = setTimeout(() => { wrap(); syncIndicators(); }, 140);
    };
    const onScrollEnd = () => { wrap(); syncIndicators(); };

    el.addEventListener('scroll', onScroll, { passive: true });
    if (hasScrollEnd) el.addEventListener('scrollend', onScrollEnd);
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', onScroll);
      if (hasScrollEnd) el.removeEventListener('scrollend', onScrollEnd);
    };
  }, [syncIndicators, wrap]);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    const { step } = metrics.current;
    if (!el || step <= 0) return;
    // A whole page of cards, so it always lands on a card boundary.
    el.scrollBy({ left: dir * step * perView, behavior: 'smooth' });
  }, [perView]);

  const goToPage = (target: number) => {
    const el = trackRef.current;
    const { step, setWidth } = metrics.current;
    if (!el || step <= 0) return;
    // Stay in whichever copy the user is currently looking at.
    const base = looping && setWidth > 0 ? Math.floor(el.scrollLeft / setWidth) * setWidth : 0;
    el.scrollTo({ left: base + target * perView * step, behavior: 'smooth' });
  };

  // Pause autoplay while the section is off-screen — no timers or scrolling
  // work for a carousel nobody is looking at.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!autoplayMs || !looping || interacting || tabHidden || !onScreen) return;
    // Honour the OS "reduce motion" setting — no unattended movement.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => scrollByPage(1), autoplayMs);
    return () => clearInterval(t);
  }, [autoplayMs, looping, interacting, tabHidden, onScreen, scrollByPage]);

  if (count === 0) return <>{empty ?? null}</>;

  // Three copies once looping is on; a single copy on the server and whenever
  // the products already fit on screen (so a machine never appears twice).
  const copies = looping ? [0, 1, 2] : [0];
  const showControls = canPrev || canNext;
  const showDots = pageCount > 1;

  return (
    <div
      className="fcar"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
      onTouchStart={() => setInteracting(true)}
      onTouchEnd={() => setInteracting(false)}
    >
      <div className="fcar__track" ref={trackRef}>
        {copies.map((copy) => products.map((p) => (
          <div className="fcar__slide" key={`${copy}-${p.id}`}>
            <ProductCard product={p} badge={badge} />
          </div>
        )))}
      </div>

      {(showControls || showDots) && (
        <div className="fcar__controls">
          <button
            type="button"
            className="fcar__btn"
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            aria-label={`Previous ${label}`}
          >
            <ChevronLeft size={20} />
          </button>

          {showDots && (
            <div className="fcar__dots">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`fcar__dot${i === page ? ' is-active' : ''}`}
                  onClick={() => goToPage(i)}
                  aria-label={`Go to slide ${i + 1} of ${pageCount}`}
                  aria-current={i === page || undefined}
                >
                  <span />
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="fcar__btn"
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            aria-label={`Next ${label}`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
