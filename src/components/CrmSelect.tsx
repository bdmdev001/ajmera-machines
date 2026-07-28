'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, X, Plus } from 'lucide-react';

/* ============================================================================
   Dependency-free searchable selects for the CRM forms & filters.

   - <SearchableSelect>  single value, type to filter, optional "clear".
   - <MultiSelect>       multiple values shown as removable chips; `creatable`
                         lets the user add a value that isn't in the list yet
                         (used for Tags).

   Both are keyboard-accessible (↑/↓/Enter/Esc), close on outside-click, and
   match the site's input chrome via the global input styling + tokens.
   ========================================================================= */

const panel: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
  background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
  maxHeight: 240, overflowY: 'auto', padding: 4,
};

function useOutside(ref: React.RefObject<HTMLDivElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

function optionRow(active: boolean, selected: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '8px 10px', fontSize: 13.5, borderRadius: 6, cursor: 'pointer',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: selected ? 'var(--accent)' : 'var(--text-primary)', fontWeight: selected ? 600 : 400,
  };
}

interface SingleProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
  clearable?: boolean;
  id?: string;
  ariaLabel?: string;
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Select…', invalid, clearable = true, id, ariaLabel }: SingleProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => { setOpen(false); setQuery(''); });

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  const pick = (v: string) => { onChange(v); setOpen(false); setQuery(''); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button" id={id} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'var(--bg-surface)', border: `1px solid ${invalid ? 'var(--hot)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 14, cursor: 'pointer',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {clearable && value && (
            <X size={15} onClick={(e) => { e.stopPropagation(); onChange(''); }} style={{ color: 'var(--text-muted)' }} aria-label="Clear" />
          )}
          <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
        </span>
      </button>

      {open && (
        <div style={panel} role="listbox">
          <input
            autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder="Type to search…"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) pick(filtered[active]); }
              else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            }}
            style={{ marginBottom: 4, padding: '8px 10px', fontSize: 13.5 }}
          />
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--text-muted)' }}>No matches</div>
          ) : (
            filtered.map((o, i) => (
              <div
                key={o} role="option" aria-selected={o === value}
                onMouseEnter={() => setActive(i)} onClick={() => pick(o)}
                style={optionRow(i === active, o === value)}
              >
                <span>{o}</span>
                {o === value && <Check size={15} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface MultiProps {
  value: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
  creatable?: boolean;
  id?: string;
  ariaLabel?: string;
}

export function MultiSelect({ value, onChange, options, placeholder = 'Select…', creatable, id, ariaLabel }: MultiProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => { setOpen(false); setQuery(''); });

  const available = useMemo(
    () => options.filter((o) => !value.includes(o) && o.toLowerCase().includes(query.toLowerCase())),
    [options, value, query],
  );
  const canCreate = creatable && query.trim() &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === query.trim().toLowerCase());

  const add = (v: string) => { const t = v.trim(); if (t && !value.includes(t)) onChange([...value, t]); setQuery(''); setActive(0); };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        id={id} aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)', padding: '8px 10px', minHeight: 46, cursor: 'text',
        }}
      >
        {value.map((v) => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600 }}>
            {v}
            <X size={13} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); remove(v); }} aria-label={`Remove ${v}`} />
          </span>
        ))}
        <input
          value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          placeholder={value.length ? '' : placeholder}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, available.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (available[active]) add(available[active]); else if (canCreate) add(query); }
            else if (e.key === 'Backspace' && !query && value.length) remove(value[value.length - 1]);
            else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
          }}
          style={{ flex: 1, minWidth: 90, border: 'none', background: 'transparent', padding: 4, fontSize: 13.5 }}
        />
      </div>

      {open && (available.length > 0 || canCreate) && (
        <div style={panel} role="listbox">
          {available.map((o, i) => (
            <div key={o} role="option" aria-selected={false} onMouseEnter={() => setActive(i)} onClick={() => add(o)} style={optionRow(i === active, false)}>
              <span>{o}</span>
            </div>
          ))}
          {canCreate && (
            <div onClick={() => add(query)} style={{ ...optionRow(false, false), color: 'var(--accent)', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Add “{query.trim()}”</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
