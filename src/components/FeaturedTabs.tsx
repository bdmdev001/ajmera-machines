'use client';

import { useState } from 'react';
import type { IProduct } from '@/models/Product';
import ProductCard from './ProductCard';

interface Props {
  products: IProduct[];
}

const TABS: { label: string; match: (c: string) => boolean }[] = [
  { label: 'All Machines', match: () => true },
  { label: 'Grinding', match: (c) => /grind/i.test(c) },
  { label: 'Turning', match: (c) => /vtl|lathe/i.test(c) },
  { label: 'Milling', match: (c) => /mill/i.test(c) },
  { label: 'Sheet Metal', match: (c) => /press|shear|notch|bandsaw|saw/i.test(c) },
  { label: 'Drilling & Boring', match: (c) => /drill|boring/i.test(c) },
];

export default function FeaturedTabs({ products }: Props) {
  const [active, setActive] = useState(0);
  const filtered = products.filter((p) => TABS[active].match(p.category || ''));

  return (
    <div>
      <div className="tabs" style={{ justifyContent: 'center', display: 'flex', marginBottom: 36 }}>
        {TABS.map((t, i) => (
          <button key={t.label} className={`tab ${i === active ? 'is-active' : ''}`} onClick={() => setActive(i)}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
          {filtered.slice(0, 8).map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              badge={i === 0 ? { label: 'New', tone: 'new' } : undefined}
            />
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
          No machines in this group right now — <a href="/contact" style={{ color: 'var(--accent)', fontWeight: 600 }}>send an enquiry</a> and we&apos;ll source one.
        </p>
      )}
    </div>
  );
}
