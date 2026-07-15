'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';

export interface RecentItem {
  id: string;
  title: string;
  image?: string;
  category?: string;
}

const KEY = 'aj_recent_machines';

export default function RecentlyViewed({ current }: { current: RecentItem }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    let stored: RecentItem[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      stored = [];
    }
    const others = stored.filter((p) => p.id !== current.id);

    const updated = [current, ...others].slice(0, 8);
    try {
      localStorage.setItem(KEY, JSON.stringify(updated));
    } catch {
      /* ignore quota / privacy mode */
    }

    const raf = requestAnimationFrame(() => setItems(others.slice(0, 5)));
    return () => cancelAnimationFrame(raf);
  }, [current.id, current.title, current.image, current.category]);

  if (items.length === 0) return null;

  return (
    <section className="section-sm">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <History size={20} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 27px)' }}>Recently viewed</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {items.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="surface" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#eef1f4', flexShrink: 0 }}>
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                {p.category && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.category}</div>}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
