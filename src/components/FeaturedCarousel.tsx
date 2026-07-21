'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { IProduct } from '@/models/Product';
import ProductCard from './ProductCard';

interface Props {
  products: IProduct[];
}

/**
 * Responsive, dependency-free carousel for the homepage "Featured machines"
 * section. Uses native CSS scroll-snap for smooth sliding + touch/swipe, with
 * Prev/Next buttons layered on top. The number of cards per view is controlled
 * purely by CSS (see .fcar__slide breakpoints in globals.css): 4 on desktop,
 * down to 1 on phones. Cards, info, actions and the Featured badge are the
 * existing ProductCard — unchanged.
 */
export default function FeaturedCarousel({ products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, products.length]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // Advance by ~one viewport of cards; scroll-snap lands cleanly on a card.
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  // Empty state — no products are marked Featured yet.
  if (products.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
        No featured machines yet — <a href="/contact" style={{ color: 'var(--accent)', fontWeight: 600 }}>send an enquiry</a> and we&apos;ll help you source one.
      </p>
    );
  }

  const showControls = canPrev || canNext;

  return (
    <div className="fcar">
      <div className="fcar__track" ref={trackRef}>
        {products.map((p) => (
          <div className="fcar__slide" key={p.id}>
            <ProductCard product={p} badge={{ label: 'Featured', tone: 'new' }} />
          </div>
        ))}
      </div>

      {showControls && (
        <div className="fcar__controls">
          <button
            type="button"
            className="fcar__btn"
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            aria-label="Previous machines"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="fcar__btn"
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            aria-label="Next machines"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
