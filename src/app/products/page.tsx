import Link from 'next/link';
import {
  Search as SearchIcon, X, ChevronRight, ChevronLeft, ArrowRight, MessageCircle, Sparkles,
} from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import SortSelect from '@/components/SortSelect';
import FiltersPanel from '@/components/FiltersPanel';
import FiltersDrawer from '@/components/FiltersDrawer';
import WhyChooseProducts from '@/components/WhyChooseProducts';
import { getAllProducts, productMatchesSize, productMatchesCapacity, productMatchesQuery, productMatchesSpecPair } from '@/lib/products';
import type { IProduct } from '@/models/Product';

export const dynamic = 'force-dynamic';

type SP = { [k: string]: string | undefined };

const PAGE_SIZE = 12;

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

function distinct(items: (string | undefined)[]): string[] {
  return Array.from(new Set(items.filter((v): v is string => !!v && v !== 'N/A'))).sort();
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { search, category, make, country, year, size, capacity, spec, sort } = sp;

  const specQuery = spec?.trim() ?? '';
  // A selected autocomplete suggestion arrives as "Label: Value" — match it
  // precisely (same spec line) so results equal the suggested machine count.
  // Free-typed text (no colon) uses the flexible token match instead.
  const colonAt = specQuery.indexOf(':');
  const specPair = colonAt > 0
    ? { label: specQuery.slice(0, colonAt).trim(), value: specQuery.slice(colonAt + 1).trim() }
    : null;

  const all = await getAllProducts();

  // ---- Filter (in-memory; resilient to DB being offline) ----
  const q = search?.trim().toLowerCase();
  let filtered = all.filter((p) => {
    if (category && p.category !== category) return false;
    if (make && p.make !== make) return false;
    if (country && p.country !== country) return false;
    if (year && p.myear !== year) return false;
    // Legacy Size / Capacity params (kept working for any existing links).
    if (size && !productMatchesSize(p, size)) return false;
    if (capacity && !productMatchesCapacity(p, capacity)) return false;
    // Size / Capacity / specification requirement. A picked suggestion
    // ("Label: Value") matches precisely on one spec line; free text matches
    // flexibly across the product's actual technical specifications.
    if (specQuery) {
      const ok = specPair && specPair.value
        ? productMatchesSpecPair(p, specPair.label, specPair.value)
        : productMatchesQuery(p, specQuery);
      if (!ok) return false;
    }
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

  // ---- Filter option lists ----
  const categories = distinct(all.map((p) => p.category));
  // Brands are scoped to the selected Category (only brands that have products
  // in it); cleared category ⇒ all brands.
  const makes = distinct((category ? all.filter((p) => p.category === category) : all).map((p) => p.make));

  // Pre-fill the enquiry form from the current selection so a "no results"
  // search becomes a sourcing request carrying the category + typed requirement.
  const requirement = [
    'I am looking for a machine matching the following requirement:',
    category ? `• Category: ${category}` : null,
    specQuery ? `• Required size / capacity / specification: ${specQuery}` : null,
    search ? `• Keyword: ${search}` : null,
    '',
    'Please help me find a suitable machine matching this requirement.',
  ].filter((l) => l !== null).join('\n');
  const requirementHref = `/contact?requirement=${encodeURIComponent(requirement)}${category ? `&enquiry=${encodeURIComponent(category)}` : ''}`;

  // ---- Pagination ----
  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(pageNum, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const hasFilters = !!(search || category || make || country || year || size || capacity || specQuery);

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
    values: { category, make, spec: specQuery },
    options: { categories, makes },
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
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Product List</span>
            {category && (<><ChevronRight size={14} /><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{category}</span></>)}
          </nav>
          <h1 className="display" style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', marginBottom: 12, maxWidth: 900 }}>
            {category ? category : 'Quality Pre-Owned Industrial Machinery for Your Requirements'}
          </h1>
          {!category && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
              <p style={{ fontSize: 15, textAlign: 'justify' }}>
                Explore a carefully selected range of pre-owned industrial machines from trusted manufacturers and brands. Each machine is inspected and presented with detailed information to help you make a confident decision for your production, manufacturing, and engineering requirements.Whether you are looking to expand your capabilities, replace existing equipment, or find a cost-effective solution for a specific application, explore our product list to discover machinery that matches your needs.
              </p>
              <p style={{ fontSize: 15, textAlign: 'justify' }}>
                Browse the available machines, use the filters to find the right equipment, and request the best price for your requirement.
              </p>
            </div>
          )}
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
                {([['search', search], ['category', category], ['make', make], ['country', country], ['year', year], ['size', size], ['capacity', capacity], ['spec', specQuery]] as const)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <Link key={k} href={hrefWith({ [k]: undefined, page: undefined })}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '5px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {k === 'search' ? `“${v}”` : k === 'spec' ? (specPair ? v : `Requirement: ${v}`) : v} <X size={13} />
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
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Can&apos;t find the right machine?</h3>
                <p style={{ maxWidth: 460, fontSize: 14, margin: '0 auto 22px' }}>Tell us what you need — your required size, capacity or specification — and our team will help you find a suitable machine.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={requirementHref} className="btn btn-primary">Submit Your Requirement <ArrowRight size={16} /></Link>
                  {hasFilters && <Link href="/products" className="btn btn-secondary">Clear all filters</Link>}
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

        {/* ===== Editorial content — sits BELOW the listing and never affects
             the product grid, search, filters, sorting or pagination above. ===== */}
        <div style={{ marginTop: 'clamp(48px, 7vw, 80px)', display: 'flex', flexDirection: 'column', gap: 'clamp(40px, 6vw, 64px)' }}>
          {/* Why Choose Our Products? (shared component) */}
          <WhyChooseProducts />

          {/* Find the Right Machine Faster */}
          <section>
            <span className="eyebrow" style={{ marginBottom: 10 }}>Smarter sourcing</span>
            <h2 style={{ fontSize: 'clamp(24px, 3.2vw, 34px)', marginBottom: 12 }}>Find the Right Machine Faster</h2>
            <p style={{ fontSize: 15.5, maxWidth: 760 }}>
              Compare multiple machines, review detailed specifications, and identify the equipment that best matches your production requirements.
            </p>
          </section>

          {/* Request Your Best Price — CTA */}
          <section>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: 'var(--dark)', color: '#fff', padding: 'clamp(28px, 4vw, 48px)' }}>
              <div aria-hidden style={{ position: 'absolute', top: -70, right: -50, width: 240, height: 240, borderRadius: '50%', background: 'var(--accent)', opacity: 0.18 }} />
              <span className="eyebrow" style={{ color: '#7ea6d8', marginBottom: 10 }}>For buyers</span>
              <h2 style={{ position: 'relative', color: '#fff', fontSize: 'clamp(24px, 3.2vw, 34px)', marginBottom: 14, maxWidth: 640 }}>Request Your Best Price</h2>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 680, marginBottom: 24 }}>
                <p style={{ color: 'rgba(238,241,244,0.82)', textAlign: 'justify' }}>
                  Found the machine you&apos;re looking for? Simply submit a Best Price Request, and our sales team will provide a competitive quotation, availability details, delivery timelines, and any additional information you need to make an informed purchasing decision.
                </p>
                <p style={{ color: 'rgba(238,241,244,0.82)', textAlign: 'justify' }}>
                  Whether you&apos;re purchasing a single machine or multiple units, we&apos;ll work to provide the best possible commercial offer.
                </p>
              </div>
              <div style={{ position: 'relative', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/contact" className="btn btn-primary btn-lg">Request Best Price <ArrowRight size={18} /></Link>
              </div>
            </div>
          </section>

          {/* Need Expert Assistance? */}
          <section>
            <div className="surface" style={{ padding: 'clamp(24px, 4vw, 40px)', borderRadius: 'var(--radius-lg)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', marginBottom: 16 }}>
                <Sparkles size={24} />
              </span>
              <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', marginBottom: 14 }}>Need Expert Assistance?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720, marginBottom: 22 }}>
                <p style={{ fontSize: 15.5, textAlign: 'justify' }}>Not sure which machine is right for your application?</p>
                <p style={{ fontSize: 15.5, textAlign: 'justify' }}>Our experienced team is here to help you choose the most suitable equipment based on your production requirements, budget, and technical specifications.</p>
                <p style={{ fontSize: 15.5, textAlign: 'justify' }}>Browse our product list, filter your options, and request your best price today.</p>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={WA} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp"><MessageCircle size={16} /> WhatsApp us</a>
              </div>
            </div>
          </section>
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
