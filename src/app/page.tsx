import Link from 'next/link';
import { Fragment } from 'react';
import {
  ArrowRight, MessageCircle, ShieldCheck, Truck, Gauge, Globe,
  PackageCheck, Wrench, FileText, CalendarClock, ArrowUpRight,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import Counter from '@/components/Counter';
import MachineFinder from '@/components/MachineFinder';
import FeaturedTabs from '@/components/FeaturedTabs';
import ProductCard from '@/components/ProductCard';
import type { IProduct } from '@/models/Product';
import {
  getFeaturedProducts, getCategoryStats, getTotalMachines, getFilterOptions,
} from '@/lib/products';
import { cldUrl, cldSrcSet } from '@/lib/images';

export const revalidate = 3600;

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

/* Hero LCP photo (Cloudinary). Rendered as a real <img> — see below — so the
   browser's preload scanner discovers it in the initial HTML instead of waiting
   for the CSSOM (which is what made the old CSS background a 14.6s LCP). */
const HERO_IMG = 'https://res.cloudinary.com/z5xktswf/image/upload/v1784268553/ajmera/homepage/hero-light';

const CATEGORY_META: Record<string, string> = {
  'Grinder Surface': 'Surface grinders',
  'Grinder Cylindrical': 'Cylindrical grinders',
  'Grinder Centreless': 'Centreless grinders',
  VTL: 'Vertical turret lathes',
  'Press Brake': 'Press brakes',
  'Milling Bed': 'Bed milling machines',
  Lathe: 'Heavy-duty lathes',
  'Drill Radial': 'Radial drills',
};

const INSIGHTS = [
  { tag: 'Buying Guide', title: 'How we inspect a used machine before it earns a place in our stock', read: '5 min read' },
  { tag: 'Export', title: 'Crating & documentation: moving multi-tonne machines across borders', read: '4 min read' },
  { tag: 'Maintenance', title: 'Geometry checks that tell you a grinder still holds tolerance', read: '6 min read' },
];

export default async function Home() {
  const products = await getFeaturedProducts(12);
  const categories = getCategoryStats().slice(0, 6);
  const total = getTotalMachines();
  const options = getFilterOptions();

  return (
    <div>
      {/* ================= 1 — HERO ================= */}
      <section className="hero-photo" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* LCP element: real <img> (not a CSS background) so it is discovered by
            the preload scanner immediately and marked high priority. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="hero-photo-img"
          src={cldUrl(HERO_IMG, { width: 1280 })}
          srcSet={cldSrcSet(HERO_IMG, [640, 960, 1280, 1600])}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        <div className="hero-photo-overlay" aria-hidden />
        <div className="container" style={{ position: 'relative', zIndex: 2, padding: 'clamp(52px, 7vw, 96px) 20px clamp(60px, 7vw, 130px)' }}>
          <div className="hero-copy" style={{ maxWidth: 640 }}>
            <Reveal>
              <span className="badge badge-dark" style={{ marginBottom: 22, padding: '7px 14px', letterSpacing: '0.1em' }}>Used · Inspected · Exported</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display" style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 22 }}>
                Industrial machines,<br /><span style={{ color: 'var(--accent)' }}>ready to run.</span>
              </h1>
            </Reveal>
            <Reveal delay={150}>
              <p style={{ fontSize: 'clamp(16px, 1.6vw, 19px)', color: 'var(--text-secondary)', maxWidth: 540, marginBottom: 32, lineHeight: 1.6 }}>
                Premium industrial machinery sourced from renowned Japanese & European brands. Built to maximize precision, efficiency, and long-term value.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 34 }}>
                <Link href="/products" className="btn btn-primary btn-lg">Browse Products <ArrowRight size={18} /></Link>
                <Link href="/contact" className="btn btn-hot btn-lg">Get Best Price</Link>
                <a href={WA} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg"><MessageCircle size={18} /> WhatsApp</a>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 22px' }}>
                {[
                  { Icon: ShieldCheck, a: 'Inspected', b: 'under power' },
                  { Icon: Globe, a: '25+', b: 'countries' },
                  { Icon: Truck, a: 'Worldwide', b: 'export' },
                ].map(({ Icon, a, b }, i) => (
                  <Fragment key={a}>
                    {i > 0 && <span aria-hidden className="hide-mobile" style={{ width: 1, height: 30, background: 'var(--border-strong)' }} />}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Icon size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>{a}</span><span>{b}</span>
                      </span>
                    </span>
                  </Fragment>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Machine finder — overlaps hero bottom */}
          <Reveal className="hero-finder" delay={120} style={{ marginTop: 'clamp(40px, 5vw, 64px)', marginBottom: -80, position: 'relative', zIndex: 5 }}>
            <MachineFinder categories={options.categories} makes={options.makes} countries={options.countries} years={options.years} />
          </Reveal>
        </div>
      </section>

      {/* ================= 2 — CATEGORIES ================= */}
      <section className="section after-finder" style={{ paddingTop: 'clamp(110px, 12vw, 150px)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 36 }}>
            <Reveal>
              <div>
                <span className="eyebrow" style={{ marginBottom: 10 }}>Shop by category</span>
                <h2 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)' }}>Browse machine categories</h2>
              </div>
            </Reveal>
            <Reveal delay={80}><Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>View all <ArrowRight size={16} /></Link></Reveal>
          </div>

          <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {categories.map((cat, i) => (
              <Reveal key={cat.category} delay={i * 60}>
                <Link href={`/products?category=${encodeURIComponent(cat.category)}`} className="category-card-hover surface" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 18, borderRadius: 'var(--radius-lg)', transition: 'all var(--transition-normal)' }}>
                  <div style={{ width: 92, height: 92, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: '#eef1f4' }}>
                    {cat.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cldUrl(cat.image, { width: 184, height: 184, crop: 'fill' })}
                        alt={cat.category}
                        width={92}
                        height={92}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{cat.category}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{CATEGORY_META[cat.category] ?? 'Precision machinery'}</p>
                    <span className="badge badge-soft">{cat.count} in stock</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 3 — FEATURED (tabs) ================= */}
      <section className="section band-white" style={{ borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow" style={{ marginBottom: 10 }}>Best of the stocklist</span>
              <h2>Featured machines</h2>
              <p>Freshly inspected arrivals across our most-requested categories.</p>
            </div>
          </Reveal>
          <Reveal delay={80}><FeaturedTabs products={products} /></Reveal>
        </div>
      </section>

      {/* ================= 4 — PROMO BANNERS ================= */}
      <section className="section-sm">
        <div className="container">
          <div className="promo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
            {[
              { icon: PackageCheck, kicker: 'Selling a machine?', title: 'We buy quality used machinery', body: 'Get a fair valuation for your surplus engineering equipment.', cta: 'Sell to us', href: '/contact', tone: 'var(--accent)' },
              { icon: FileText, kicker: 'For buyers', title: 'Download the full stocklist', body: 'Specs, make, model and origin for every machine — in one PDF.', cta: 'Download Brochure', href: '/products', tone: 'var(--hot)' },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 90}>
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: 'var(--dark)', color: '#fff', padding: 'clamp(28px, 4vw, 44px)' }}>
                  <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: p.tone, opacity: 0.16 }} />
                  <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.1)', color: p.tone, marginBottom: 18 }}><p.icon size={26} /></span>
                  <div style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(238,241,244,0.6)', marginBottom: 8 }}>{p.kicker}</div>
                  <h3 style={{ position: 'relative', color: '#fff', fontSize: 'clamp(20px, 2.4vw, 27px)', marginBottom: 10, maxWidth: 340 }}>{p.title}</h3>
                  <p style={{ position: 'relative', color: 'rgba(238,241,244,0.7)', marginBottom: 22, maxWidth: 360 }}>{p.body}</p>
                  <Link href={p.href} className="btn" style={{ position: 'relative', background: p.tone, color: '#fff' }}>{p.cta} <ArrowRight size={16} /></Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 5 — STATS ================= */}
      <section className="section-sm">
        <div className="container">
          <div className="stats-grid surface" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center', padding: 'clamp(28px, 4vw, 48px)', borderRadius: 'var(--radius-xl)' }}>
            {[
              { icon: CalendarClock, to: 30, suffix: '+', label: 'Years in business' },
              { icon: PackageCheck, to: total, suffix: '+', label: 'Machines catalogued' },
              { icon: Globe, to: 25, suffix: '+', label: 'Countries served' },
              { icon: Gauge, to: 1500, suffix: '+', label: 'Buyers served', format: true },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div>
                  <s.icon size={26} style={{ color: 'var(--accent)', marginBottom: 12 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    <Counter to={s.to} suffix={s.suffix} format={s.format} />
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 6 — LATEST ARRIVALS ================= */}
      <section className="section band-paper">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 36 }}>
            <Reveal>
              <div>
                <span className="eyebrow" style={{ marginBottom: 10 }}>Just added</span>
                <h2 style={{ fontSize: 'clamp(24px, 3.2vw, 38px)' }}>Latest arrivals</h2>
              </div>
            </Reveal>
            <Reveal delay={80}><Link href="/products" className="btn btn-secondary">View all inventory <ArrowRight size={16} /></Link></Reveal>
          </div>
          <div className="best-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
            {products.slice(4, 12).map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCardWrap product={p} hot={i === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 7 — INSIGHTS ================= */}
      {/* <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow" style={{ marginBottom: 10 }}>Knowledge base</span>
              <h2>Insights &amp; buying tips</h2>
              <p>Practical guidance on inspecting, buying and moving used machinery.</p>
            </div>
          </Reveal>
          <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {INSIGHTS.map((b, i) => (
              <Reveal key={i} delay={i * 90}>
                <Link href="/contact" className="surface" style={{ display: 'block', overflow: 'hidden', borderRadius: 'var(--radius-lg)', transition: 'all var(--transition-normal)' }}>
                  <div style={{ height: 150, background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', display: 'grid', placeItems: 'center' }}>
                    <Wrench size={40} color="#fff" style={{ opacity: 0.5 }} />
                  </div>
                  <div style={{ padding: 22 }}>
                    <span className="badge badge-soft" style={{ marginBottom: 12 }}>{b.tag}</span>
                    <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, marginBottom: 14 }}>{b.title}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                      <span>{b.read}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontWeight: 600 }}>Read <ArrowUpRight size={15} /></span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section> */}

      {/* ================= 8 — NEWSLETTER / CTA ================= */}
      {/* <section style={{ background: 'var(--accent)', color: '#fff' }}>
        <div className="container" style={{ padding: 'clamp(44px, 6vw, 72px) 20px' }}>
          <div className="promo-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 32, alignItems: 'center' }}>
            <Reveal>
              <div>
                <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 3.4vw, 40px)', marginBottom: 12 }}>Get new arrivals &amp; best prices first</h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>Join buyers who hear about fresh stock before it&apos;s listed. No spam — just machines.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <form suppressHydrationWarning style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input suppressHydrationWarning type="email" required placeholder="Your email address" aria-label="Email" style={{ flex: 1, minWidth: 200, height: 52, border: 'none' }} />
                <button type="submit" className="btn btn-dark btn-lg" style={{ height: 52 }}>Subscribe <ArrowRight size={16} /></button>
              </form>
            </Reveal>
          </div>
        </div>
      </section> */}
    </div>
  );
}

/* Small server wrapper so we can vary the corner badge without a client boundary. */
function ProductCardWrap({ product, hot }: { product: IProduct; hot?: boolean }) {
  return <ProductCard product={product} badge={hot ? { label: 'Hot', tone: 'hot' } : undefined} />;
}
