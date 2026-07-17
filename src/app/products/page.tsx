import Link from 'next/link';
import {
  Search as SearchIcon, X, ChevronRight, ChevronLeft,
} from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import SortSelect from '@/components/SortSelect';
import FiltersPanel from '@/components/FiltersPanel';
import FiltersDrawer from '@/components/FiltersDrawer';
import { getAllProducts } from '@/lib/products';
import type { IProduct } from '@/models/Product';

export const dynamic = 'force-dynamic';

type SP = { [k: string]: string | undefined };

const PAGE_SIZE = 12;

function distinct(items: (string | undefined)[]): string[] {
  return Array.from(new Set(items.filter((v): v is string => !!v && v !== 'N/A'))).sort();
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { search, category, make, country, year, sort } = sp;

  const all = await getAllProducts();

  // ---- Filter (in-memory; resilient to DB being offline) ----
  const q = search?.trim().toLowerCase();
  let filtered = all.filter((p) => {
    if (category && p.category !== category) return false;
    if (make && p.make !== make) return false;
    if (country && p.country !== country) return false;
    if (year && p.myear !== year) return false;
    if (q) {
      const hay = `${p.title} ${p.make} ${p.model} ${p.stockNo} ${p.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // ---- Sort ----
  // Newest-first is the default: `getAllProducts` returns docs already ordered by
  // createdAt desc, so we compare createdAt when present and fall back to stockNo
  // (keeps the seed fallback and any legacy docs sensibly ordered).
  const ts = (p: IProduct) => (p.createdAt ? new Date(p.createdAt).getTime() : 0);
  const byNewest = (a: IProduct, b: IProduct) =>
    ts(b) - ts(a) || (b.stockNo || '').localeCompare(a.stockNo || '');
  filtered = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'oldest': return -byNewest(a, b);
      case 'make': return (a.make || '').localeCompare(b.make || '');
      case 'title': return (a.title || '').localeCompare(b.title || '');
      default: return byNewest(a, b); // newest first
    }
  });

  // ---- Filter option lists (from full catalogue) ----
  const categories = distinct(all.map((p) => p.category));
  const makes = distinct(all.map((p) => p.make));
  const countries = distinct(all.map((p) => p.country));
  const years = distinct(all.map((p) => p.myear)).sort((a, b) => b.localeCompare(a));

  // ---- Pagination ----
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(pageNum, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const hasFilters = !!(search || category || make || country || year);

  const hrefWith = (changes: SP) => {
    const merged: SP = { ...sp, ...changes };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const qs = u.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

  // Shared props for the filter content, reused by the desktop sidebar and the
  // mobile drawer so no filter JSX is duplicated.
  const filtersProps = {
    sp,
    values: { category, make, country, year },
    options: { categories, makes, countries, years },
    hasFilters,
  };

  return (
    <div>
      {/* ---- Page header band ---- */}
      <div className="band-paper" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ padding: '30px 20px 34px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Stocklist</span>
            {category && (<><ChevronRight size={14} /><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{category}</span></>)}
          </nav>
          <h1 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', marginBottom: 8 }}>
            {category ? category : 'Machinery Stocklist'}
          </h1>
          <p style={{ fontSize: 15, maxWidth: 560 }}>
            {filtered.length} inspected machine{filtered.length === 1 ? '' : 's'} available. Filter the catalogue, then request a best price on anything that fits.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '36px 20px 72px' }}>
        <div className="products-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32, alignItems: 'start' }}>

          {/* ---- Sidebar (desktop ≥1024px) ---- */}
          <aside className="surface filters-desktop" style={{ padding: 24, borderRadius: 'var(--radius-lg)', position: 'sticky', top: 96 }}>
            <FiltersPanel {...filtersProps} />
          </aside>

          {/* ---- Main ---- */}
          <main>
            {/* Toolbar */}
            <div className="products-toolbar">
              {/* Filters trigger + slide-in drawer (tablet / mobile only) */}
              <FiltersDrawer>
                <FiltersPanel {...filtersProps} />
              </FiltersDrawer>

              <div className="products-toolbar__results">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {filtered.length} result{filtered.length === 1 ? '' : 's'}
                </span>
                {[['search', search], ['category', category], ['make', make], ['country', country], ['year', year]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <Link key={k as string} href={hrefWith({ [k as string]: undefined, page: undefined })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {k === 'search' ? `“${v}”` : v} <X size={13} />
                    </Link>
                  ))}
              </div>
              <div className="products-toolbar__sort">
                <SortSelect />
              </div>
            </div>

            {/* Grid */}
            {pageItems.length > 0 ? (
              <div className="products-grid">
                {pageItems.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="surface" style={{ textAlign: 'center', padding: '72px 24px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)', margin: '0 auto 20px' }}>
                  <SearchIcon size={24} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No machines match your filters</h3>
                <p style={{ maxWidth: 400, fontSize: 14, margin: '0 auto 22px' }}>Try loosening a filter, or send us the spec and we&apos;ll source it for you.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/products" className="btn btn-primary">Clear all filters</Link>
                  <Link href="/contact" className="btn btn-secondary">Send an enquiry</Link>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 44 }}>
                <PageLink disabled={current === 1} href={hrefWith({ page: String(current - 1) })}><ChevronLeft size={16} /></PageLink>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - current) <= 1)
                  .map((n, idx, arr) => (
                    <span key={n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {idx > 0 && arr[idx - 1] !== n - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                      <Link href={hrefWith({ page: n === 1 ? undefined : String(n) })}
                        style={{
                          minWidth: 40, height: 40, display: 'grid', placeItems: 'center', padding: '0 8px',
                          borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                          background: n === current ? 'var(--accent)' : 'var(--bg-surface)',
                          color: n === current ? '#fff' : 'var(--text-primary)',
                          border: '1px solid ' + (n === current ? 'var(--accent)' : 'var(--border-light)'),
                        }}>
                        {n}
                      </Link>
                    </span>
                  ))}
                <PageLink disabled={current === totalPages} href={hrefWith({ page: String(current + 1) })}><ChevronRight size={16} /></PageLink>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled?: boolean; children: React.ReactNode }) {
  const style: React.CSSProperties = {
    width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-light)', background: 'var(--bg-surface)',
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto',
  };
  return <Link href={href} style={style}>{children}</Link>;
}
