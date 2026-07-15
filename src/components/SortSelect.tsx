'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownWideNarrow } from 'lucide-react';

const OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'make', label: 'Make: A–Z' },
  { value: 'title', label: 'Name: A–Z' },
];

export default function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('sort') ?? 'newest';

  const change = (value: string) => {
    const p = new URLSearchParams(params.toString());
    if (value === 'newest') p.delete('sort');
    else p.set('sort', value);
    p.delete('page');
    router.push(`/products${p.toString() ? `?${p.toString()}` : ''}`);
  };

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ArrowDownWideNarrow size={16} style={{ color: 'var(--text-muted)' }} />
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Sort</span>
      <select
        suppressHydrationWarning
        value={current}
        onChange={(e) => change(e.target.value)}
        style={{ width: 'auto', height: 42, padding: '0 34px 0 12px', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-display)' }}
      >
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
