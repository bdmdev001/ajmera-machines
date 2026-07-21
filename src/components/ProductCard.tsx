'use client';

import Link from 'next/link';
import { IProduct } from '@/models/Product';
import { MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { cldUrl, cldSrcSet } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';

interface ProductCardProps {
  product: IProduct;
  /** Optional corner badge, e.g. "Featured" or "New" (section context). */
  badge?: { label: string; tone?: 'hot' | 'new' };
}

export default function ProductCard({ product, badge }: ProductCardProps) {
  const hasImage = product.images && product.images.length > 0;
  const PLACEHOLDER = 'https://placehold.co/600x450/eef1f4/93a0af?text=Machine';
  const mainImage = hasImage ? cldUrl(product.images[0], { width: 600 }) : PLACEHOLDER;
  const mainSrcSet = hasImage ? cldSrcSet(product.images[0], [300, 450, 600, 800]) : undefined;

  const detailHref = getProductUrl(product);
  const hasCountry = !!product.country && product.country !== 'N/A';
  const outOfStock = product.stockStatus === 'Out of Stock';
  const customBadges = Array.isArray(product.badges) ? product.badges.filter(Boolean) : [];

  return (
    // The whole card is the primary (and only) interaction — it opens the
    // product detail page. No per-card action buttons or duplicate CTAs.
    <Link href={detailHref} className="pcard" aria-label={product.title}>
      {/* Image */}
      <div className="pcard-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainImage}
          srcSet={mainSrcSet}
          sizes="(max-width: 560px) 90vw, (max-width: 1024px) 45vw, 300px"
          alt={product.title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.srcset = '';
            e.currentTarget.src = PLACEHOLDER;
          }}
        />

        {/* Corner badges: section badge (Featured/New) + admin custom badges */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          {badge && (
            <span className={`badge ${badge.tone === 'hot' ? 'badge-hot' : 'badge-new'}`}>{badge.label}</span>
          )}
          {customBadges.map((b) => (
            <span key={b} className="badge badge-dark">{b}</span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
          {product.category}
        </span>

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

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          <span><strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{product.make}</strong></span>
          {product.model && product.model !== 'N/A' && <span>Model {product.model}</span>}
          {product.myear && <span>Yr {product.myear}</span>}
        </div>

        {/* Stock status + origin ("Made in …") — both from admin-managed data */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          {outOfStock ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--hot)' }}>
              <XCircle size={15} /> Out of stock
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>
              <CheckCircle2 size={15} style={{ color: '#16A34A' }} />
              <span><span style={{ color: '#16A34A' }}>Verified</span> · In stock</span>
            </span>
          )}
          {hasCountry && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <MapPin size={13} /> Made in {product.country}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
