'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { imageUrl, type ImageRef } from '@/lib/images';

interface ImageGalleryProps {
  images: ImageRef[]; // structured { url, public_id } or legacy strings
  title: string;
}

const FALLBACK = 'https://placehold.co/900x700/eef1f4/93a0af?text=Machine';
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const imgList = images && images.length > 0 ? images.map((img) => imageUrl(img)) : [FALLBACK];
  const multiple = imgList.length > 1;

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Zoom / pan state for the lightbox
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const touchStartX = useRef<number | null>(null);
  const stageTouchX = useRef<number | null>(null);

  // Thumbnail carousel (all breakpoints): horizontal scroll + arrow controls +
  // keep the active thumbnail in view when the main image changes.
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [thumbNav, setThumbNav] = useState({ overflow: false, atStart: true, atEnd: false });

  const resetZoom = useCallback(() => { setScale(1); setPan({ x: 0, y: 0 }); }, []);

  const openAt = (idx: number) => { setActiveIdx(idx); resetZoom(); setLightbox(true); };
  const close = useCallback(() => { setLightbox(false); resetZoom(); }, [resetZoom]);

  const goto = useCallback((next: number) => {
    setActiveIdx((prev) => {
      const n = (next + imgList.length) % imgList.length;
      return n;
    });
    resetZoom();
  }, [imgList.length, resetZoom]);

  const nextImg = useCallback(() => goto(activeIdx + 1), [activeIdx, goto]);
  const prevImg = useCallback(() => goto(activeIdx - 1), [activeIdx, goto]);

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // ---- Thumbnail carousel controls ----
  const updateThumbNav = useCallback(() => {
    const el = thumbsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumbNav({ overflow: max > 2, atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2 });
  }, []);

  const scrollThumbs = (dir: 1 | -1) => {
    thumbsRef.current?.scrollBy({ left: dir * thumbsRef.current.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Recompute arrow state on mount, resize, scroll and when the image set changes.
  useEffect(() => {
    const el = thumbsRef.current;
    if (!el) return;
    updateThumbNav();
    el.addEventListener('scroll', updateThumbNav, { passive: true });
    window.addEventListener('resize', updateThumbNav);
    return () => { el.removeEventListener('scroll', updateThumbNav); window.removeEventListener('resize', updateThumbNav); };
  }, [updateThumbNav, imgList.length]);

  // Keep the active thumbnail visible — scrolls ONLY the strip, never the page.
  useEffect(() => {
    const el = thumbsRef.current;
    const btn = el?.children[activeIdx] as HTMLElement | undefined;
    if (!el || !btn) return;
    const bLeft = btn.offsetLeft;
    const bRight = bLeft + btn.offsetWidth;
    if (bLeft < el.scrollLeft) el.scrollTo({ left: Math.max(0, bLeft - 8), behavior: 'smooth' });
    else if (bRight > el.scrollLeft + el.clientWidth) el.scrollTo({ left: bRight - el.clientWidth + 8, behavior: 'smooth' });
  }, [activeIdx]);

  // Keyboard controls (only while lightbox open)
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' && multiple) nextImg();
      else if (e.key === 'ArrowLeft' && multiple) prevImg();
      else if (e.key === '+' || e.key === '=') zoomBy(0.5);
      else if (e.key === '-') zoomBy(-0.5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, multiple, close, nextImg, prevImg, zoomBy]);

  // Lock body scroll while the lightbox is open
  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [lightbox]);

  // Pan handlers (mouse + touch via pointer events)
  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onPointerUp = () => { setIsDragging(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Active image — premium card with a Gaussian-blur backdrop of the same
          image. Acts as an inline carousel on every breakpoint: swipe on touch
          devices, arrow buttons on pointer devices; the image stays `contain`ed
          so no part of the machine is cropped. */}
      <div
        className="gallery-stage"
        onTouchStart={(e) => { stageTouchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (stageTouchX.current == null) return;
          const dx = e.changedTouches[0].clientX - stageTouchX.current;
          if (Math.abs(dx) > 40 && multiple) { if (dx < 0) nextImg(); else prevImg(); }
          stageTouchX.current = null;
        }}
      >
        {/* Blurred backdrop (same image, covers the stage, darkened for depth) */}
        <div
          aria-hidden
          className="gallery-stage__blur"
          style={{ backgroundImage: `url("${imgList[activeIdx]}")` }}
        />
        <div aria-hidden className="gallery-stage__overlay" />

        {/* Sharp product image, centered above the backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgList[activeIdx]}
          alt={`${title} — image ${activeIdx + 1}`}
          onClick={() => openAt(activeIdx)}
          className="gallery-stage__img"
          onError={(e) => { e.currentTarget.src = FALLBACK; }}
        />

        {multiple && (
          <span style={{ position: 'absolute', top: 14, left: 14, padding: '5px 11px', borderRadius: 'var(--radius-pill)', background: 'rgba(20,24,31,0.72)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            {activeIdx + 1} / {imgList.length}
          </span>
        )}

        {/* Fullscreen trigger */}
        <button
          type="button"
          onClick={() => openAt(activeIdx)}
          aria-label="Open fullscreen preview"
          style={{ position: 'absolute', bottom: 14, right: 14, display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
        >
          <Maximize2 size={17} />
        </button>
      </div>

      {/* Thumbnail carousel — horizontal slider on every breakpoint. Arrows
          appear only when the strip overflows its container; the strip itself
          stays swipeable (native scroll) on touch devices. */}
      {multiple && (
        <div className="gallery-thumbs">
          {thumbNav.overflow && (
            <button type="button" className="gallery-thumbs__nav" onClick={() => scrollThumbs(-1)} disabled={thumbNav.atStart} aria-label="Previous thumbnails">
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="gallery-thumbs-track" ref={thumbsRef}>
            {imgList.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-current={activeIdx === idx}
                style={{
                  width: 74, height: 74, flexShrink: 0, padding: 0, cursor: 'pointer', overflow: 'hidden',
                  borderRadius: 'var(--radius-md)', background: '#fff',
                  border: activeIdx === idx ? '2px solid var(--accent)' : '1px solid var(--border-light)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`${title} thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = FALLBACK; }} />
              </button>
            ))}
          </div>
          {thumbNav.overflow && (
            <button type="button" className="gallery-thumbs__nav" onClick={() => scrollThumbs(1)} disabled={thumbNav.atEnd} aria-label="Next thumbnails">
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* ---- Fullscreen lightbox ---- */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} image preview`}
          onClick={close}
          style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(8,10,13,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Top toolbar */}
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>
              {multiple ? `${activeIdx + 1} / ${imgList.length}` : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" aria-label="Zoom out" onClick={() => zoomBy(-0.5)} disabled={scale <= MIN_SCALE} style={lbBtn(scale <= MIN_SCALE)}><ZoomOut size={20} /></button>
              <button type="button" aria-label="Zoom in" onClick={() => zoomBy(0.5)} disabled={scale >= MAX_SCALE} style={lbBtn(scale >= MAX_SCALE)}><ZoomIn size={20} /></button>
              <button type="button" aria-label="Close preview" onClick={close} style={lbBtn(false)}><X size={20} /></button>
            </div>
          </div>

          {/* Prev / next */}
          {multiple && (
            <>
              <button type="button" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); prevImg(); }}
                style={{ ...lbNav, left: 12 }}><ChevronLeft size={26} /></button>
              <button type="button" aria-label="Next image" onClick={(e) => { e.stopPropagation(); nextImg(); }}
                style={{ ...lbNav, right: 12 }}><ChevronRight size={26} /></button>
            </>
          )}

          {/* Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => zoomBy(e.deltaY < 0 ? 0.3 : -0.3)}
            onDoubleClick={() => (scale > 1 ? resetZoom() : setScale(2))}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null || scale > 1) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 50 && multiple) { dx < 0 ? nextImg() : prevImg(); }
              touchStartX.current = null;
            }}
            style={{ maxWidth: '94vw', maxHeight: '86vh', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgList[activeIdx]}
              alt={`${title} — image ${activeIdx + 1}`}
              draggable={false}
              style={{
                maxWidth: '94vw', maxHeight: '86vh', objectFit: 'contain', userSelect: 'none',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.18s ease',
              }}
              onError={(e) => { e.currentTarget.src = FALLBACK; }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const lbBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
});

const lbNav: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', zIndex: 2,
};
