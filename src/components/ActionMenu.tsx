'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/* ============================================================================
   Dependency-free dropdown for grouping toolbar actions (Import / Export / …).

   Keeps listing toolbars from sprawling into a row of single-purpose buttons:
   related actions live behind one labelled trigger, and new actions are added
   by appending to `groups` — the toolbar layout never changes.

   - Items are either a callback (`onSelect`) or a download link (`href`).
   - Closes on select, outside-click and Escape; focus returns to the trigger.
   - Keyboard: ↑/↓/Home/End to move, Enter/Space to pick, Esc to close.
   - Flips horizontally when the panel would run off either viewport edge, so
     it behaves on desktop, tablet and mobile (where the toolbar wraps).
   ========================================================================= */

type IconType = React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;

export interface ActionMenuItem {
  key: string;
  label: string;
  /** Secondary line under the label — use it to explain what the action does. */
  description?: string;
  icon?: IconType;
  /** Renders the row as a download link instead of a button. */
  href?: string;
  download?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  /** Small pill on the right, e.g. "Soon" for not-yet-shipped formats. */
  badge?: string;
}

export interface ActionMenuGroup {
  key: string;
  /** Optional uppercase heading above the group. */
  label?: string;
  items: ActionMenuItem[];
}

interface Props {
  label: string;
  icon?: IconType;
  groups: ActionMenuGroup[];
  /** Rendered below the items, inside the panel. Clicks here don't close it. */
  footer?: React.ReactNode;
  /** Preferred edge to line the panel up with; auto-flips if it won't fit. */
  align?: 'start' | 'end';
  className?: string;
  buttonClassName?: string;
  minWidth?: number;
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EDGE_GAP = 8;

export default function ActionMenu({
  label,
  icon: Icon,
  groups,
  footer,
  align = 'end',
  className,
  buttonClassName = 'btn btn-secondary btn-sm',
  minWidth = 248,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [side, setSide] = useState<'start' | 'end'>(align);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const keyboardNav = useRef(false);

  // Flat list of selectable rows — the index space the keyboard walks — plus a
  // key → index lookup so each rendered row knows its position.
  const rows = groups.flatMap((g) => g.items).filter((i) => !i.disabled);
  const rowIndex = new Map(rows.map((item, i) => [item.key, i]));

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    setActive(-1);
    keyboardNav.current = false;
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);

  // Keep the panel inside the viewport once it has been laid out.
  useIsoLayoutEffect(() => {
    if (!open) { setSide(align); return; }
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    if (!panel || !trigger) return;
    const t = trigger.getBoundingClientRect();
    const w = panel.offsetWidth;
    const vw = window.innerWidth;
    if (align === 'end') {
      if (t.right - w < EDGE_GAP && t.left + w <= vw - EDGE_GAP) setSide('start');
    } else if (t.left + w > vw - EDGE_GAP && t.right - w >= EDGE_GAP) {
      setSide('end');
    }
  }, [open, align]);

  // Move real focus with the highlight, but only while navigating by keyboard —
  // so Enter/Space activate the row natively (downloads included).
  useEffect(() => {
    if (!open || !keyboardNav.current || active < 0) return;
    rowRefs.current[active]?.focus();
  }, [open, active]);

  const move = (next: number) => { keyboardNav.current = true; setActive(next); };

  // Bound to the root so it catches keys from the trigger and from any row.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { if (open) { e.stopPropagation(); close(true); } return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    if (!open) {
      setOpen(true);
      move(e.key === 'ArrowUp' || e.key === 'End' ? rows.length - 1 : 0);
      return;
    }
    if (e.key === 'ArrowDown') move(active < 0 ? 0 : (active + 1) % rows.length);
    else if (e.key === 'ArrowUp') move(active <= 0 ? rows.length - 1 : active - 1);
    else if (e.key === 'Home') move(0);
    else move(rows.length - 1);
  };

  // Every selection dismisses the menu — but a download link has to survive the
  // click that triggered it, so unmount it on the next tick instead.
  const run = (item: ActionMenuItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    if (item.href) setTimeout(() => close(true), 0);
    else close(true);
  };

  return (
    <div
      ref={rootRef}
      className={className}
      onKeyDown={onKeyDown}
      // Tabbing out of the trigger, a row or the footer dismisses the menu.
      onBlur={(e) => { if (open && !rootRef.current?.contains(e.relatedTarget as Node)) close(); }}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { if (open) close(); else { keyboardNav.current = false; setActive(-1); setOpen(true); } }}
      >
        {Icon && <Icon size={15} />}
        {label}
        <ChevronDown size={14} style={{ marginLeft: -2, transition: 'transform var(--transition-fast)', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', zIndex: 60,
            ...(side === 'end' ? { right: 0 } : { left: 0 }),
            // The min() keeps a wide menu from forcing horizontal overflow on
            // small phones, where min-width would otherwise beat max-width.
            minWidth: `min(${minWidth}px, calc(100vw - ${EDGE_GAP * 4}px))`,
            maxWidth: `min(340px, calc(100vw - ${EDGE_GAP * 4}px))`,
            background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
            padding: 5, maxHeight: 'min(70vh, 440px)', overflowY: 'auto',
            textAlign: 'left',
          }}
        >
          {groups.map((group, gi) => (
            <div key={group.key}>
              {gi > 0 && <div style={{ height: 1, background: 'var(--border-light)', margin: '5px 0' }} />}
              {group.label && (
                <div style={{ padding: '6px 10px 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const i = rowIndex.get(item.key) ?? -1;
                const on = i >= 0 && i === active;
                const RowIcon = item.icon;

                const style: React.CSSProperties = {
                  display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                  padding: '9px 10px', borderRadius: 6, border: 'none', textAlign: 'left',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  color: item.disabled ? 'var(--text-muted)' : on ? 'var(--accent)' : 'var(--text-primary)',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  opacity: item.disabled ? 0.6 : 1,
                  textDecoration: 'none', font: 'inherit', outline: 'none',
                };

                const body = (
                  <>
                    {RowIcon && <RowIcon size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>
                      {item.description && (
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</span>
                      )}
                    </span>
                    {item.badge && (
                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}>{item.badge}</span>
                    )}
                  </>
                );

                const shared = {
                  role: 'menuitem' as const,
                  tabIndex: -1,
                  onMouseEnter: () => { if (i >= 0) { keyboardNav.current = false; setActive(i); } },
                  style,
                };

                return item.href && !item.disabled ? (
                  <a
                    key={item.key}
                    {...shared}
                    ref={(el) => { if (i >= 0) rowRefs.current[i] = el; }}
                    href={item.href}
                    download={item.download ?? true}
                    onClick={() => run(item)}
                  >
                    {body}
                  </a>
                ) : (
                  <button
                    key={item.key}
                    {...shared}
                    ref={(el) => { if (i >= 0) rowRefs.current[i] = el; }}
                    type="button"
                    disabled={item.disabled}
                    aria-disabled={item.disabled || undefined}
                    onClick={() => run(item)}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          ))}

          {footer && (
            <>
              <div style={{ height: 1, background: 'var(--border-light)', margin: '5px 0' }} />
              <div style={{ padding: '2px 4px 4px' }}>{footer}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
