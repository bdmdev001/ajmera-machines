'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IProduct } from '@/models/Product';
import { ArrowRight, Eye, Heart, MessageCircle, MapPin, CheckCircle2 } from 'lucide-react';
import { imageUrl } from '@/lib/images';

interface ProductCardProps {
  product: IProduct;
  /** Optional corner badge, e.g. "NEW" or "HOT" */
  badge?: { label: string; tone?: 'hot' | 'new' };
}

const WA = '919322401398';

export default function ProductCard({ product, badge }: ProductCardProps) {
  const [saved, setSaved] = useState(false);

  const mainImage =
    product.images && product.images.length > 0
      ? imageUrl(product.images[0])
      : 'https://placehold.co/600x450/eef1f4/93a0af?text=Machine';

  const detailHref = `/products/${product.id}`;
  const quoteHref = `/contact?enquiry=${encodeURIComponent(product.title)}&stock=${encodeURIComponent(product.stockNo)}`;
  const waHref = `https://api.whatsapp.com/send?phone=${WA}&text=${encodeURIComponent(
    `Hi, I'd like the best price for ${product.title} (Stock ${product.stockNo}).`
  )}`;

  return (
    <div className="pcard">
      {/* Image */}
      <div className="pcard-img">
        <Link href={detailHref} aria-label={product.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mainImage}
            alt={product.title}
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/600x450/eef1f4/93a0af?text=Machine';
            }}
          />
        </Link>

        {/* Corner badges */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {badge && (
            <span className={`badge ${badge.tone === 'hot' ? 'badge-hot' : 'badge-new'}`}>{badge.label}</span>
          )}
          {product.country && product.country !== 'N/A' && (
            <span className="badge badge-dark">{product.country}</span>
          )}
        </div>

        {/* Hover quick-actions */}
        <div className="pcard-actions">
          <button
            type="button"
            aria-label={saved ? 'Saved' : 'Save'}
            onClick={() => setSaved((s) => !s)}
            style={saved ? { background: 'var(--hot)', color: '#fff', borderColor: 'var(--hot)' } : undefined}
          >
            <Heart size={16} fill={saved ? '#fff' : 'none'} />
          </button>
          <Link href={detailHref} aria-label="View details">
            <Eye size={16} />
          </Link>
          <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp enquiry">
            <MessageCircle size={16} />
          </a>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
          {product.category}
        </span>

        <Link href={detailHref}>
          <h3
            style={{
              fontSize: 15.5,
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              marginBottom: 12,
              minHeight: 44,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.title}
          </h3>
        </Link>

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          <span><strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{product.make}</strong></span>
          {product.model && product.model !== 'N/A' && <span>Model {product.model}</span>}
          {product.myear && <span>Yr {product.myear}</span>}
        </div>

        {/* Availability + origin */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>
            <CheckCircle2 size={15} style={{ color: '#16A34A' }} />
            <span><span style={{ color: '#16A34A' }}>Verified</span> · In stock</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
            <MapPin size={13} /> {product.country || 'India'}
          </span>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          <Link href={quoteHref} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
            Request Quote <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
