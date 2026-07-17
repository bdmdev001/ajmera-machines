import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  ChevronRight, MapPin, MessageCircle, ShieldCheck, Truck,
  Gauge, Tag, Settings, HardDrive, Layers, Globe, Calendar, ArrowRight,
  CheckCircle2, Factory, ListChecks, FileText, Play, Sparkles,
} from 'lucide-react';
import ImageGallery from '@/components/ImageGallery';
import EnquiryForm from '@/components/EnquiryForm';
import RecentlyViewed from '@/components/RecentlyViewed';
import ProductCard from '@/components/ProductCard';
import ShareProduct from '@/components/ShareProduct';
import { getAllProducts, getProductByStockNo } from '@/lib/products';
import { imageUrl } from '@/lib/images';
import {
  getProductSlug, getProductUrl, getProductAbsoluteUrl, extractIdToken,
} from '@/lib/productUrl';
import type { IProduct } from '@/models/Product';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

const WA_BASE = 'https://api.whatsapp.com/send?phone=919322401398&text=';

/** Marketing description reused by the page body, metadata and JSON-LD. */
function buildDescription(p: IProduct): string {
  return `The ${p.make !== 'N/A' ? `${p.make} ` : ''}${p.title} is a quality used ${p.category.toLowerCase()} machine${p.country && p.country !== 'N/A' ? ` of ${p.country} origin` : ''}, available from our Navi Mumbai stockyard. Each machine in our inventory is inspected and tested under power before it is listed, with its make, model, year and specifications documented transparently. Request a quote for best pricing, condition photos and export logistics.`;
}

/** Dynamic, per-product SEO metadata (canonical + Open Graph + Twitter). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductByStockNo(extractIdToken(slug));
  if (!product) return { title: 'Machine not found — Ajmera Enterprise' };

  const url = getProductAbsoluteUrl(product);
  const brand = product.make && product.make !== 'N/A' ? ` ${product.make}` : '';
  const title = `${product.title}${brand ? ` —${brand}` : ''} (Stock ${product.stockNo}) | Ajmera Enterprise`;
  const description = buildDescription(product).slice(0, 300);
  const image = product.images?.[0] ? imageUrl(product.images[0]) : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Ajmera Enterprise',
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function youtubeEmbed(url?: string): string {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return m?.[1] ? `https://www.youtube.com/embed/${m[1]}` : '';
}

type SpecRow = { label: string; value: string } | { note: string };
function parseSpecs(raw?: string): SpecRow[] {
  if (!raw) return [];
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.indexOf(':');
    return i > 0 && i < line.length - 1
      ? { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() }
      : { note: line };
  });
}

const FEATURES = [
  'Inspected and tested under power before listing',
  'Geometry & alignment verified to hold tolerance',
  'Transparent origin, make, model and year records',
  'Detailed photographs of the actual machine',
  'Available for pre-purchase inspection on request',
  'Professional dismantling, crating & loading',
];

const APPLICATIONS = [
  'Automotive & ancillary manufacturing',
  'Die, mould & tool rooms',
  'Heavy fabrication & structural work',
  'Aerospace & defence machining',
  'General engineering job shops',
  'Energy, power & railway components',
];

const SectionHead = ({ icon: Icon, title, sub }: { icon: typeof ListChecks; title: string; sub?: string }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'clamp(19px, 2.4vw, 24px)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon size={18} /></span>
      {title}
    </h2>
    {sub && <p style={{ fontSize: 14, marginTop: 8 }}>{sub}</p>}
  </div>
);

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  // Resolve efficiently by the trailing identifier token (indexed stockNo/id) —
  // no full-collection scan.
  const product = await getProductByStockNo(extractIdToken(slug));
  if (!product) notFound();

  // Enforce the canonical SEO slug: any legacy numeric URL (/products/2010) or a
  // stale/incorrect descriptive slug with a valid stock number is permanently
  // redirected to the single canonical URL — never rendering duplicate content.
  const canonicalSlug = getProductSlug(product);
  if (slug !== canonicalSlug) permanentRedirect(`/products/${canonicalSlug}`);

  const all = await getAllProducts();
  const related = all.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const fill = related.length < 4
    ? all.filter((p) => p.id !== product.id && !related.includes(p)).slice(0, 4 - related.length)
    : [];
  const relatedList = [...related, ...fill];

  const embed = youtubeEmbed(product.videoUrl);
  const specRows = parseSpecs(product.technicalSpecifications);
  const shareSpecs = specRows.filter((r): r is { label: string; value: string } => 'label' in r);
  const shareNotes = specRows.filter((r): r is { note: string } => 'note' in r).map((r) => r.note);
  const mainImg = product.images?.[0] ? imageUrl(product.images[0]) : undefined;

  const waHref = `${WA_BASE}${encodeURIComponent(`Hi, I'd like the best price for ${product.title} (Stock ${product.stockNo}).`)}`;

  const infoCards: { icon: typeof Tag; label: string; value: string; accent?: boolean }[] = [
    { icon: Tag, label: 'Stock No.', value: product.stockNo, accent: true },
    { icon: Layers, label: 'Category', value: product.category },
    { icon: Settings, label: 'Make', value: product.make },
    { icon: HardDrive, label: 'Model', value: product.model },
    ...(product.myear ? [{ icon: Calendar, label: 'Year', value: product.myear }] : []),
    { icon: Globe, label: 'Country', value: product.country || 'N/A' },
    { icon: ShieldCheck, label: 'Condition', value: 'Inspected' },
    { icon: CheckCircle2, label: 'Availability', value: 'In stock' },
  ];

  const description = buildDescription(product);

  // Product JSON-LD (no invented price/offers — only real, known fields).
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description,
    sku: product.stockNo,
    url: getProductAbsoluteUrl(product),
    ...(product.make && product.make !== 'N/A' ? { brand: { '@type': 'Brand', name: product.make } } : {}),
    ...(product.model && product.model !== 'N/A' ? { model: product.model } : {}),
    ...(product.category && product.category !== 'N/A' ? { category: product.category } : {}),
    ...(product.images.length ? { image: product.images.map((im) => imageUrl(im)) } : {}),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="band-paper" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ padding: '16px 20px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <Link href="/">Home</Link><ChevronRight size={14} />
            <Link href="/products">Stocklist</Link><ChevronRight size={14} />
            <Link href={`/products?category=${encodeURIComponent(product.category)}`} style={{ color: 'var(--text-secondary)' }}>{product.category}</Link>
            <ChevronRight size={14} />
            <span style={{
              color: 'var(--text-primary)',
              fontWeight: 600,
              wordBreak: 'break-word',
            }}>{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="container" style={{ padding: 'clamp(24px, 4vw, 40px) 20px 64px' }}>
        {/* ===== Hero: gallery + summary ===== */}
        <div className="detail-layout">
          <ImageGallery images={product.images} title={product.title} />

          <div className="detail-side">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-new">{product.category}</span>
              {product.country && product.country !== 'N/A' && <span className="badge badge-dark">{product.country}</span>}
              <span className="badge badge-soft">Verified · In stock</span>
            </div>

            <div>
              <h1 className="display" style={{ fontSize: 'clamp(25px, 3.4vw, 38px)', lineHeight: 1.14, marginBottom: 12 }}>{product.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={16} style={{ color: 'var(--accent)' }} /> {product.country || 'N/A'}</span>
                <span style={{ color: 'var(--border-strong)' }}>•</span>
                <span>Stock <strong style={{ color: 'var(--accent)' }}>{product.stockNo}</strong></span>
              </div>
            </div>

            {/* Key facts as responsive info cards */}
            <div className="info-grid">
              {infoCards.map((f) => (
                <div key={f.label} className="info-card">
                  <span className="info-card__icon"><f.icon size={18} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="info-card__label">{f.label}</div>
                    <div className="info-card__value" style={f.accent ? { color: 'var(--accent)' } : undefined}>{f.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action card — enquiry CTAs (sticky with the info column on desktop) */}
            <div className="action-card">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Interested in this machine?</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Reply within hours</span>
              </div>
              <div className="action-buttons">
                <a href="#enquiry" className="btn btn-primary" style={{ width: '100%' }}>Send Enquiry <ArrowRight size={18} /></a>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp" style={{ width: '100%' }}><MessageCircle size={17} /> WhatsApp</a>
                <ShareProduct
                  product={{
                    id: product.id,
                    title: product.title,
                    stockNo: product.stockNo,
                    category: product.category,
                    make: product.make,
                    model: product.model,
                    year: product.myear,
                    country: product.country,
                    condition: 'Inspected',
                    availability: 'In stock',
                  }}
                  description={description}
                  specs={shareSpecs}
                  notes={shareNotes}
                  features={FEATURES}
                  applications={APPLICATIONS}
                  images={product.images.map((f) => imageUrl(f))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', paddingTop: 14, marginTop: 2, borderTop: '1px solid var(--border-light)' }}>
                {[[ShieldCheck, 'Inspected'], [Gauge, 'Geometry checked'], [Truck, 'Export ready']].map(([Icon, label], i) => {
                  const I = Icon as typeof ShieldCheck;
                  return <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)' }}><I size={16} style={{ color: 'var(--accent)' }} /> {label as string}</span>;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Content sections ===== */}
        <div style={{ marginTop: 'clamp(40px, 6vw, 64px)', display: 'flex', flexDirection: 'column', gap: 'clamp(32px, 5vw, 52px)' }}>
          {/* Description */}
          <section>
            <SectionHead icon={FileText} title="Description" />
            <div className="surface" style={{ padding: 'clamp(20px, 3vw, 32px)', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ fontSize: 'clamp(15.5px, 1.5vw, 17px)', lineHeight: 1.8, textAlign: 'justify' }}>{description}</p>
            </div>
          </section>

          {/* Specifications */}
          <section>
            <SectionHead icon={ListChecks} title="Specifications" sub="As documented for this machine. Ask us for the full spec sheet." />
            {specRows.length > 0 ? (
              <div className="spec-grid">
                {specRows.map((r, i) =>
                  'note' in r ? (
                    <p key={i} className="spec-note">{r.note}</p>
                  ) : (
                    <div key={i} className="spec-card">
                      <div className="spec-card__label">{r.label}</div>
                      <div className="spec-card__value">{r.value}</div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p style={{ fontSize: 15, color: 'var(--text-muted)' }}>No technical specifications recorded — <a href="#enquiry" style={{ color: 'var(--accent)', fontWeight: 600 }}>request the full spec sheet</a>.</p>
            )}
          </section>

          {/* Features + Applications */}
          <section>
            <div className="detail-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(28px, 4vw, 48px)' }}>
              <div>
                <SectionHead icon={Sparkles} title="Features & advantages" />
                <div className="surface" style={{ padding: 'clamp(20px, 3vw, 28px)', borderRadius: 'var(--radius-lg)' }}>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {FEATURES.map((f) => (
                      <li key={f} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', fontSize: 14.5, color: 'var(--text-secondary)' }}>
                        <CheckCircle2 size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <SectionHead icon={Factory} title="Typical applications" />
                <div className="surface" style={{ padding: 'clamp(20px, 3vw, 28px)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {APPLICATIONS.map((a) => (
                      <span key={a} className="pill-neutral" style={{ display: 'inline-flex', padding: '9px 14px', borderRadius: 'var(--radius-pill)', fontSize: 13, fontWeight: 500 }}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Video (no 360) */}
          {embed && (
            <section>
              <SectionHead icon={Play} title="Machine video" />
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: '#000', maxWidth: 900 }}>
                <iframe src={embed} title={`${product.title} video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
              </div>
            </section>
          )}
        </div>

        {/* ===== Enquiry ===== */}
        {/* <div id="enquiry" style={{ marginTop: 'clamp(44px, 6vw, 64px)', scrollMarginTop: 24 }}>
          <div className="detail-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'clamp(28px, 4vw, 44px)', alignItems: 'center' }}>
            <div>
              <span className="eyebrow" style={{ marginBottom: 12 }}>Get the best price</span>
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', marginBottom: 14 }}>Enquire about this machine</h2>
              <p style={{ fontSize: 15.5, marginBottom: 22 }}>Send your requirement and our team replies with availability, condition photos and best pricing — usually within hours. No obligation.</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Fast, no-obligation quotation', 'Condition photos & video on request', 'Export crating & logistics arranged'].map((t) => (
                  <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--text-secondary)' }}><ShieldCheck size={17} style={{ color: 'var(--accent)' }} /> {t}</li>
                ))}
              </ul>
            </div>
            <EnquiryForm productId={product._id?.toString()} productTitle={product.title} stockNo={product.stockNo} />
          </div>
        </div> */}
        <div
          id="enquiry"
          className="enquiry-section"
          style={{
            marginTop: 'clamp(44px, 6vw, 64px)',
            scrollMarginTop: 24,
          }}
        >
          <div className="detail-layout enquiry-layout">
            <div className="enquiry-content">
              <span className="eyebrow" style={{ marginBottom: 12 }}>
                Get the best price
              </span>

              <h2 className="enquiry-title">
                Enquire about this machine
              </h2>

              <p className="enquiry-description">
                Send your requirement and our team replies with availability,
                condition photos and best pricing — usually within hours.
                No obligation.
              </p>

              <ul className="enquiry-benefits">
                {[
                  'Fast, no-obligation quotation',
                  'Condition photos & video on request',
                  'Export crating & logistics arranged',
                ].map((t) => (
                  <li key={t}>
                    <ShieldCheck size={17} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="enquiry-form-wrapper">
              <EnquiryForm
                productId={product._id?.toString()}
                productTitle={product.title}
                stockNo={product.stockNo}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Related ===== */}
      {relatedList.length > 0 && (
        <section className="section-sm band-paper" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: 8 }}>You may also like</span>
                <h2 style={{ fontSize: 'clamp(22px, 2.8vw, 32px)' }}>Related machines</h2>
              </div>
              <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="btn btn-secondary btn-sm">More in {product.category} <ArrowRight size={15} /></Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 22 }}>
              {relatedList.map((p: IProduct) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed current={{ id: product.id, title: product.title, image: mainImg, category: product.category, url: getProductUrl(product) }} />

      {/* Sticky mobile CTA */}
      <div
        className="mobile-bottom-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'none', // Hidden by default
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: 'rgba(255,255,255,.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border-light)',
          boxShadow: '0 -8px 24px rgba(20,24,31,.10)',
        }}
      >
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp"
          style={{
            flex: 1,
            justifyContent: 'center',
            minHeight: 48,
          }}
        >
          <MessageCircle size={17} />
          WhatsApp
        </a>

        <a
          href="#enquiry"
          className="btn btn-primary"
          style={{
            flex: 1,
            justifyContent: 'center',
            minHeight: 48,
          }}
        >
          Request Quote
        </a>
      </div>
    </div>
  );
}
