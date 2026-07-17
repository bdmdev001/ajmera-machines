import Link from 'next/link';
import { RotateCcw, SlidersHorizontal, MessageCircle } from 'lucide-react';

type SP = { [k: string]: string | undefined };

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20need%20help%20finding%20a%20machine.';

interface FiltersPanelProps {
  sp: SP;
  values: { category?: string; make?: string; country?: string; year?: string };
  options: { categories: string[]; makes: string[]; countries: string[]; years: string[] };
  hasFilters: boolean;
}

/**
 * The shared filter content used by both the desktop sidebar and the mobile
 * slide-in drawer. It renders only the inner content (no outer padding /
 * surface) so each host — the sticky <aside> on desktop, the sheet on mobile —
 * can supply its own chrome. No filtering logic lives here; every option is a
 * plain <Link> that changes the URL, exactly as before.
 */
export default function FiltersPanel({ sp, values, options, hasFilters }: FiltersPanelProps) {
  const { category, make, country, year } = values;
  const { categories, makes, countries, years } = options;

  const hrefWith = (changes: SP) => {
    const merged: SP = { ...sp, ...changes };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const qs = u.toString();
    return `/products${qs ? `?${qs}` : ''}`;
  };

  const filterGroup = (label: string, value: string | undefined, opts: string[], param: string) => (
    <div>
      <label style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', display: 'block', marginBottom: 12 }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 190, overflowY: 'auto', paddingRight: 6 }}>
        <Link href={hrefWith({ [param]: undefined, page: undefined })} style={{ fontSize: 13.5, color: !value ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: !value ? 700 : 500 }}>
          All {label}
        </Link>
        {opts.map((o) => (
          <Link key={o} href={hrefWith({ [param]: o, page: undefined })} style={{ fontSize: 13.5, color: value === o ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: value === o ? 700 : 500 }}>
            {o}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SlidersHorizontal size={17} style={{ color: 'var(--accent)' }} /> Filters
        </h3>
        {hasFilters && (
          <Link href="/products" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--hot)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RotateCcw size={13} /> Reset
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {filterGroup('Categories', category, categories, 'category')}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />
        {filterGroup('Makes', make, makes, 'make')}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />
        {filterGroup('Countries', country, countries, 'country')}
        {years.length > 0 && (<>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />
          {filterGroup('Years', year, years, 'year')}
        </>)}
      </div>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--accent-soft)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Can&apos;t find a machine? We source on request.</p>
        <a href={WA} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm btn-block">
          <MessageCircle size={15} /> Ask on WhatsApp
        </a>
      </div>
    </>
  );
}
