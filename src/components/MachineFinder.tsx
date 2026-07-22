'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface Props {
  categories: string[];
}

interface Suggestion {
  label: string;
  value: string;
  category: string;
  count: number;
}

const controlStyle: React.CSSProperties = { height: 50, fontFamily: 'var(--font-sans)', fontSize: 14 };

/**
 * "Find your machine" — an OPTIONAL category + a single free-text Size /
 * Capacity / specification field with specification-based autocomplete. Typing
 * fetches real "Label: Value — N machines" suggestions mined from actual product
 * specs (debounced): scoped to the chosen category, or across every category
 * when none is selected (each suggestion then shows its category). Selecting one
 * filters the product list by that spec; a custom value still searches and can
 * fall through to the "Submit your requirement" state.
 */
export default function MachineFinder({ categories }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [spec, setSpec] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  // Set right before a programmatic setSpec (suggestion pick / category reset)
  // so the debounce effect doesn't immediately re-open the dropdown.
  const skipFetch = useRef(false);

  const asQuery = (s: Suggestion) => `${s.label}: ${s.value}`;

  // Debounced suggestion fetch (cancels stale requests). Category is optional —
  // when empty, the API searches every category. All state updates happen inside
  // the async callback so the effect body never triggers a synchronous cascading
  // render; the empty-input case is handled in the change handlers instead.
  useEffect(() => {
    if (skipFetch.current) { skipFetch.current = false; return; }
    const term = spec.trim();
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
      } catch { /* aborted or offline — leave existing suggestions */ }
      finally { setLoading(false); }
    }, 220);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [spec, category]);

  // Close the dropdown on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const onCategory = (v: string) => {
    skipFetch.current = true;
    setCategory(v);
    setSpec('');
    setSuggestions([]);
    setOpen(false);
  };

  const onSpecChange = (v: string) => {
    setSpec(v);
    if (!v.trim()) { setSuggestions([]); setOpen(false); }
  };

  const go = (specValue: string, cat: string = category) => {
    const p = new URLSearchParams();
    if (cat) p.set('category', cat);
    if (specValue.trim()) p.set('spec', specValue.trim());
    router.push(`/products${p.toString() ? `?${p.toString()}` : ''}`);
  };

  const pick = (s: Suggestion) => {
    skipFetch.current = true;
    const q = asQuery(s);
    setSpec(q);
    setOpen(false);
    // Scope to the suggestion's own category (its shown count) — even when no
    // category was chosen in the finder — so results match "N machines".
    go(q, category || s.category);
  };

  const showList = open && suggestions.length > 0;

  const specHint = useMemo(
    () => (category
      ? 'Start typing a size, capacity or specification for suggestions'
      : 'Searching all categories — type a size, capacity or specification'),
    [category],
  );

  return (
    <div className="surface" style={{ padding: 'clamp(18px, 3vw, 26px)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Search size={18} style={{ color: 'var(--accent)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>Find your machine</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{specHint}</span>
      </div>

      <div className="finder-grid">
        <select value={category} onChange={(e) => onCategory(e.target.value)} suppressHydrationWarning style={controlStyle} aria-label="Category">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <div ref={wrapRef} className="finder-ta">
          <input
            type="text"
            value={spec}
            onChange={(e) => onSpecChange(e.target.value)}
            onFocus={() => { if (suggestions.length) setOpen(true); }}
            onKeyDown={(e) => {
              if (showList && e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, suggestions.length - 1)); }
              else if (showList && e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); if (showList && hi >= 0) pick(suggestions[hi]); else go(spec); }
              else if (e.key === 'Escape') setOpen(false);
            }}
            placeholder="Enter required size, capacity or specification…"
            aria-label="Machine size, capacity or specification"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls="finder-suggest-list"
            role="combobox"
            autoComplete="off"
            suppressHydrationWarning
            className="finder-input"
            style={{ ...controlStyle, width: '100%' }}
          />
          {loading && <Loader2 size={16} className="finder-spinner" aria-hidden />}
          {showList && (
            <ul id="finder-suggest-list" className="finder-suggest" role="listbox" aria-label="Specification suggestions">
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

        <button type="button" onClick={() => go(spec)} suppressHydrationWarning className="btn btn-primary finder-search" style={{ height: 50, whiteSpace: 'nowrap' }}>
          <Search size={16} /> Search
        </button>
      </div>
    </div>
  );
}
