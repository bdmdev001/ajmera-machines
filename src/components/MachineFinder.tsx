'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { FinderCategory } from '@/lib/products';

interface Props {
  categories: FinderCategory[];
}

const selStyle: React.CSSProperties = { height: 50, fontFamily: 'var(--font-sans)', fontSize: 14 };
const normLoose = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/**
 * "Find your machine" — category-driven finder.
 * Category is required and is the ONLY thing that drives Size & Capacity: on
 * select we look up that category's dominant Size / Capacity attribute (label +
 * option values sourced only from that category's products). A filter with no
 * data for the category stays disabled. Brand is intentionally not here.
 */
export default function MachineFinder({ categories }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [size, setSize] = useState('');
  const [capacity, setCapacity] = useState('');

  const current = useMemo(
    () => categories.find((c) => c.category === category) ?? null,
    [categories, category],
  );

  const sizeEnabled = !!current && !!current.sizeLabel && current.sizes.length > 0;
  const capacityEnabled = !!current && !!current.capacityLabel && current.capacities.length > 0;

  const onCategory = (v: string) => { setCategory(v); setSize(''); setCapacity(''); };

  const submit = () => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (sizeEnabled && size.trim()) p.set('size', size.trim());
    if (capacityEnabled && capacity.trim()) p.set('capacity', capacity.trim());
    router.push(`/products${p.toString() ? `?${p.toString()}` : ''}`);
  };

  const placeholder = (kind: 'size' | 'capacity', enabled: boolean) => {
    const label = kind === 'size' ? current?.sizeLabel : current?.capacityLabel;
    if (enabled && label) return label;                 // e.g. "Table Size" / "Swing"
    if (current) return 'Not available';                // category chosen, but no such data
    return kind === 'size' ? 'Size' : 'Capacity';       // nothing chosen yet
  };

  return (
    <div className="surface" style={{ padding: 'clamp(18px, 3vw, 26px)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Search size={18} style={{ color: 'var(--accent)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>Find your machine</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filter our product list in seconds</span>
      </div>

      <div className="finder-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 12 }}>
        <select value={category} onChange={(e) => onCategory(e.target.value)} suppressHydrationWarning style={selStyle} aria-label="Category">
          <option value="">Category</option>
          {categories.map((c) => <option key={c.category} value={c.category}>{c.category}</option>)}
        </select>

        <Typeahead
          value={size}
          onChange={setSize}
          options={current?.sizes ?? []}
          disabled={!sizeEnabled}
          placeholder={placeholder('size', sizeEnabled)}
          ariaLabel={current?.sizeLabel ?? 'Size'}
        />

        <Typeahead
          value={capacity}
          onChange={setCapacity}
          options={current?.capacities ?? []}
          disabled={!capacityEnabled}
          placeholder={placeholder('capacity', capacityEnabled)}
          ariaLabel={current?.capacityLabel ?? 'Capacity'}
        />

        <button type="button" onClick={submit} suppressHydrationWarning className="btn btn-primary" style={{ height: 50, whiteSpace: 'nowrap' }}>
          <Search size={16} /> Search
        </button>
      </div>
    </div>
  );
}

interface TypeaheadProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

/** Lightweight typeahead: shows the category's options on focus, filters them
 *  as the user types, and lets the user pick one or type a free value. */
function Typeahead({ value, onChange, options, disabled, placeholder, ariaLabel }: TypeaheadProps) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = normLoose(value);
    const list = q ? options.filter((o) => normLoose(o).includes(q)) : options;
    return list.slice(0, 60);
  }, [value, options]);

  const show = open && !disabled && filtered.length > 0;

  return (
    <div ref={wrapRef} className="finder-ta">
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        suppressHydrationWarning
        className="finder-input"
        style={selStyle}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!show) { if (e.key === 'ArrowDown') setOpen(true); return; }
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); onChange(filtered[hi]); setOpen(false); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {show && (
        <ul className="finder-suggest" role="listbox" aria-label={`${ariaLabel} suggestions`}>
          {filtered.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={i === hi}
              className={`finder-suggest__item${i === hi ? ' is-active' : ''}`}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false); }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
