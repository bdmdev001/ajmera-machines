'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Layers, Factory, ArrowRight } from 'lucide-react';
import type { SearchIndex } from '@/lib/products';

type Section = 'Machines' | 'Categories' | 'Brands';

interface Item {
  key: string;
  label: string;
  section: Section;
  href: string;
  image?: string;
  sub?: string;
}

interface Props {
  index: SearchIndex;
  placeholder?: string;
  maxWidth?: number | string;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  return text.split(re).map((p, i) =>
    re.test(p)
      ? <mark key={i} style={{ background: 'transparent', color: 'var(--accent)', fontWeight: 700 }}>{p}</mark>
      : <span key={i}>{p}</span>
  );
}

const SECTION_META: Record<Section, { icon: typeof Layers }> = {
  Machines: { icon: Search },
  Categories: { icon: Layers },
  Brands: { icon: Factory },
};

export default function SearchBar({ index, placeholder = 'Search machines, categories, brands…', maxWidth = 640 }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Flatten the index into a single searchable list once.
  const allItems: Item[] = useMemo(() => {
    const products = index.products.map((p) => ({
      key: `p-${p.id}`, label: p.title, section: 'Machines' as Section,
      href: `/products/${p.id}`, image: p.image, sub: p.category,
    }));
    const cats = index.categories.map((c) => ({
      key: `c-${c}`, label: c, section: 'Categories' as Section,
      href: `/products?category=${encodeURIComponent(c)}`,
    }));
    const makes = index.makes.map((m) => ({
      key: `m-${m}`, label: m, section: 'Brands' as Section,
      href: `/products?make=${encodeURIComponent(m)}`,
    }));
    return [...products, ...cats, ...makes];
  }, [index]);

  // Filter + rank + cap per section.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [] as Item[];
    const scored = allItems
      .map((it) => ({ it, idx: it.label.toLowerCase().indexOf(q) }))
      .filter((x) => x.idx !== -1)
      .sort((a, b) => a.idx - b.idx || a.it.label.length - b.it.label.length);

    const caps: Record<Section, number> = { Machines: 6, Categories: 4, Brands: 4 };
    const count: Record<Section, number> = { Machines: 0, Categories: 0, Brands: 0 };
    const out: Item[] = [];
    for (const { it } of scored) {
      if (count[it.section] < caps[it.section]) { out.push(it); count[it.section] += 1; }
    }
    // keep section order: Machines, Categories, Brands
    const order: Section[] = ['Machines', 'Categories', 'Brands'];
    return out.sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
  }, [allItems, query]);

  const showDropdown = open && query.trim().length >= 1;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (showDropdown && results[activeIndex]) { e.preventDefault(); go(results[activeIndex].href); }
    }
  };

  // Group for rendering while keeping a flat index for keyboard nav.
  const sections: Section[] = ['Machines', 'Categories', 'Brands'];

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%', maxWidth }}>
      <form
        onSubmit={submit}
        suppressHydrationWarning
        style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          background: '#fff', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)', padding: '8px 8px 8px 12px', width: '100%',
          boxShadow: showDropdown ? '0 10px 30px rgba(20,24,31,0.12)' : 'var(--shadow-xs)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
        }}
      >
        <Search size={18} style={{ color: 'var(--accent)', marginRight: 10, flexShrink: 0 }} />
        <input
          suppressHydrationWarning
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); setOpen(e.target.value.trim().length >= 1); }}
          onFocus={() => { if (query.trim().length >= 1) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          aria-expanded={showDropdown}
          role="combobox"
          aria-controls="search-suggestions"
          style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 14.5, width: '100%', padding: '4px 0' }}
        />
        <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Search</button>
      </form>

      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="animate-fade-in"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%',
            background: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-xl)', overflow: 'hidden', zIndex: 1200, maxHeight: '70vh', overflowY: 'auto',
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '16px 16px 6px' }}>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>No matches for &ldquo;{query.trim()}&rdquo;.</p>
            </div>
          ) : (
            sections.map((section) => {
              const items = results.filter((r) => r.section === section);
              if (!items.length) return null;
              const SectionIcon = SECTION_META[section].icon;
              return (
                <div key={section} style={{ padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    <SectionIcon size={13} /> {section}
                  </div>
                  {items.map((it) => {
                    const flatIdx = results.indexOf(it);
                    const active = flatIdx === activeIndex;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        onClick={() => go(it.href)}
                        style={{
                          width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                          background: active ? 'var(--accent-soft)' : '#fff',
                          padding: '9px 16px', display: 'flex', gap: 12, alignItems: 'center',
                          transition: 'background 120ms ease',
                        }}
                      >
                        {it.section === 'Machines' ? (
                          it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: 'cover', flexShrink: 0, background: '#eef1f4' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                          ) : (
                            <span style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)', flexShrink: 0 }}><Search size={16} /></span>
                          )
                        ) : (
                          <span style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--secondary-soft)', display: 'grid', placeItems: 'center', color: 'var(--secondary)', flexShrink: 0 }}>
                            {it.section === 'Categories' ? <Layers size={16} /> : <Factory size={16} />}
                          </span>
                        )}
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {highlight(it.label, query)}
                          </span>
                          {it.sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{it.sub}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={() => go(query.trim() ? `/products?search=${encodeURIComponent(query.trim())}` : '/products')}
            style={{ width: '100%', textAlign: 'center', borderTop: '1px solid var(--border-light)', background: 'var(--bg-surface-2)', border: 'none', padding: '11px 14px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            See all results for &ldquo;{query.trim()}&rdquo; <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
