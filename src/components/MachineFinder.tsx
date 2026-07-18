'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

interface Props {
  categories: string[];
  makes: string[];
  countries: string[];
  years: string[];
}

/**
 * "Machine Finder" — the enquiry-site analogue of an auto-parts vehicle finder.
 * Builds a query string and routes to the stocklist with the chosen filters.
 */
export default function MachineFinder({ categories, makes, countries, years }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [make, setMake] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState('');

  const submit = () => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (make) p.set('make', make);
    if (country) p.set('country', country);
    if (year) p.set('year', year);
    router.push(`/products${p.toString() ? `?${p.toString()}` : ''}`);
  };

  const selStyle: React.CSSProperties = { height: 50, fontFamily: 'var(--font-sans)', fontSize: 14 };

  return (
    <div className="surface" style={{ padding: 'clamp(18px, 3vw, 26px)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Search size={18} style={{ color: 'var(--accent)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>Find your machine</span>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Filter our product list in seconds</span>
      </div>
      <div className="finder-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 12 }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)} suppressHydrationWarning style={selStyle}>
          <option value="">Category</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={make} onChange={(e) => setMake(e.target.value)} suppressHydrationWarning style={selStyle}>
          <option value="">Make / Brand</option>
          {makes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} suppressHydrationWarning style={selStyle}>
          <option value="">Countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} suppressHydrationWarning style={selStyle}>
          <option value="">Year</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button type="button" onClick={submit} suppressHydrationWarning className="btn btn-primary" style={{ height: 50, whiteSpace: 'nowrap' }}>
          <Search size={16} /> Search Parts
        </button>
      </div>
    </div>
  );
}
