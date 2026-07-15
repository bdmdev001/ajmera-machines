'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

/**
 * Mobile / tablet filter drawer. Renders the "Filters" trigger button (hidden
 * on desktop via CSS) plus a left slide-in sheet that hosts the shared
 * FiltersPanel content passed as `children`. All filtering logic stays in the
 * server-rendered panel — this component only owns open/close UI state.
 *
 * Closes on: outside click, Escape, or selecting any filter link inside the
 * sheet. Locks background scroll while open and animates ~300ms both ways.
 */
export default function FiltersDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="filters-trigger btn btn-secondary btn-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal size={16} /> Filters
      </button>

      <div className={`filters-drawer${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="filters-drawer__overlay" onClick={() => setOpen(false)} />
        <aside
          className="filters-drawer__sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          // Selecting a filter option (any link) navigates and closes the drawer.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) setOpen(false);
          }}
        >
          <div className="filters-drawer__bar">
            <button
              type="button"
              className="filters-drawer__close"
              aria-label="Close filters"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </aside>
      </div>
    </>
  );
}
