'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface Suggestion {
  label: string;
  value: string;
  category: string;
  count: number;
}

interface Props {
  /** Currently selected category (scopes suggestions & results when set). */
  category?: string;
  /** Current `spec` value from the URL. */
  initialValue?: string;
  /** Active search params to preserve on navigation (spec & page are reset). */
  sp: Record<string, string | undefined>;
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)',
};

/**
 * Product-list sidebar "Size / Capacity" filter with specification-based
 * autocomplete. Mirrors the homepage finder: typing fetches real "Label: Value —
 * N machines" suggestions mined from actual product specs (debounced), scoped to
 * the selected category or across all categories when none is chosen. Selecting a
 * suggestion filters precisely; free text still searches. Other active filters
 * are preserved on navigation.
 */
export default function SpecFilterInput({ category = '', initialValue = '', sp }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const skipFetch = useRef(false);
  // Unique ids so the desktop panel and the mobile drawer don't collide.
  const uid = useId();
  const inputId = `${uid}-spec`;
  const listId = `${uid}-list`;

  const asQuery = (s: Suggestion) => `${s.label}: ${s.value}`;

  // Debounced, category-scoped suggestion fetch (cancels stale requests).
  useEffect(() => {
    if (skipFetch.current) { skipFetch.current = false; return; }
    const term = value.trim();
    if (!term) return;

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spec-suggest?category=${encodeURIComponent(category)}&q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setOpen(true);
          setHi(-1);
        }
      } catch { /* aborted or offline */ }
      finally { setLoading(false); }
    }, 220);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, category]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onChange = (v: string) => {
    setValue(v);
    if (!v.trim()) { setSuggestions([]); setOpen(false); }
  };

  const go = (specValue: string, cat: string = category) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(sp)) if (val && k !== 'spec' && k !== 'page') p.set(k, val);
    if (cat) p.set('category', cat);
    const s = specValue.trim();
    if (s) p.set('spec', s);
    router.push(`/products${p.toString() ? `?${p.toString()}` : ''}`);
  };

  const pick = (s: Suggestion) => {
    skipFetch.current = true;
    const q = asQuery(s);
    setValue(q);
    setOpen(false);
    // With no category chosen, scope to the suggestion's own category so results
    // match its shown "N machines" count.
    go(q, category || s.category);
  };

  const showList = open && suggestions.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={inputId} style={labelStyle}>Size / Capacity</label>

      <div ref={wrapRef} className="finder-ta">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          onKeyDown={(e) => {
            if (showList && e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, suggestions.length - 1)); }
            else if (showList && e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); if (showList && hi >= 0) pick(suggestions[hi]); else go(value); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Enter required size, capacity or specification…"
          aria-label="Size, capacity or specification"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          role="combobox"
          autoComplete="off"
          suppressHydrationWarning
          className="finder-input"
          style={{ fontSize: 13.5, width: '100%' }}
        />
        {loading && <Loader2 size={15} className="finder-spinner" aria-hidden />}
        {showList && (
          <ul id={listId} className="finder-suggest" role="listbox" aria-label="Specification suggestions">
            {suggestions.map((s, i) => (
              <li
                key={`${s.category}|${s.label}|${s.value}`}
                role="option"
                aria-selected={i === hi}
                className={`finder-suggest__item${i === hi ? ' is-active' : ''}`}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              >
                <span className="finder-suggest__label">
                  <span className="finder-suggest__spec"><strong>{s.label}:</strong> {s.value}</span>
                  {!category && <span className="finder-suggest__cat">{s.category}</span>}
                </span>
                <span className="finder-suggest__count">
                  {s.count} machine{s.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" onClick={() => go(value)} className="btn btn-primary btn-sm btn-block">
        <Search size={15} /> Search
      </button>
    </div>
  );
}
