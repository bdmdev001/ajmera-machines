import Link from 'next/link';
import {
  ChevronRight, ArrowRight, CheckCircle2, ShieldCheck, Globe, Truck,
  Search, Wrench, Cog, Hammer, Layers, Award, Building2, MessageCircle,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import Counter from '@/components/Counter';
import { getFeaturedProducts, getTotalMachines } from '@/lib/products';
import { imageUrl } from '@/lib/images';

export const revalidate = 3600;

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

const VALUES = [
  { icon: Search, title: 'We inspect before we sell', body: 'Every machine is run under power and geometry-checked. If it doesn’t pass, it doesn’t enter our stock.' },
  { icon: Globe, title: 'Sourced from the best', body: 'Direct acquisition of premium Japanese, German, Swiss and Italian machinery — origins documented.' },
  { icon: ShieldCheck, title: 'Total transparency', body: 'Make, model, year, condition and specifications recorded honestly for every unit we list.' },
  { icon: Truck, title: 'Export handled end-to-end', body: 'Dismantling, crating, documentation and freight to 25+ countries — moved door to door.' },
];

const RANGE = [
  { icon: Wrench, title: 'Conventional workshop', body: 'Lathes, pillar & radial drills, horizontal borers, shaping, slotting and milling machines.' },
  { icon: Cog, title: 'CNC & automatics', body: 'Vertical & horizontal machining centres, CNC turning, drilling and profile grinders.' },
  { icon: Layers, title: 'Grinding specialists', body: 'Surface, cylindrical, centreless, internal, double-disc and rotary grinding units.' },
  { icon: Hammer, title: 'Sheet metal & presses', body: 'Power presses, shears, hydraulic press brakes, notching, bandsaws and cutting saws.' },
];

const TIMELINE = [
  { n: '01', title: 'Global sourcing', body: 'We acquire directly from closing plants and OEMs across Japan and Europe.' },
  { n: '02', title: 'Inspection & testing', body: 'Each unit is run under power, geometry-verified and photographed in detail.' },
  { n: '03', title: 'Documentation', body: 'Make, model, year, specifications and country recorded transparently.' },
  { n: '04', title: 'Export & delivery', body: 'Professional crating, export paperwork and freight to your facility.' },
  { n: '05', title: 'Installation support', body: 'Guidance on rigging, commissioning and spares so it earns from day one.' },
];

export default async function AboutPage() {
  const products = await getFeaturedProducts(4);
  const total = getTotalMachines();

  return (
    <div>
      {/* Header band */}
      <div className="band-paper" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ padding: '30px 20px 36px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>About Us</span>
          </nav>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 10 }}>
            Three decades in <span className="text-accent">used machinery</span>
          </h1>
          <p style={{ fontSize: 16, maxWidth: 640 }}>
            Ajmera Enterprise buys, inspects, and exports quality pre-owned engineering, tool-room, sheet-metal, and CNC machinery—trusted by industries since 1990.
          </p>
        </div>
      </div>

      {/* Story */}
      <section className="section">
        <div className="container">
          <div className="intro-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(32px, 5vw, 72px)', alignItems: 'center' }}>
            <Reveal>
              <div>
                <span className="eyebrow" style={{ marginBottom: 16 }}>Our story</span>
                <h2 style={{ fontSize: 'clamp(26px, 3.4vw, 40px)', marginBottom: 20 }}>
                  A dealer&apos;s eye for machines with <span className="text-accent">decades</span> left in them
                </h2>
                <p style={{ fontSize: 16, marginBottom: 16 }}>
                  Built on client-centric values and a long-standing reputation, <strong>Ajmera Machines</strong> is one of India’s leading dealers of pre-owned industrial machinery. We source, inspect, and stock quality used equipment from engineering workshops, tool-room, sheet-metal plants, forge shops, and complete industrial facilities—offering reliable machinery at fair, value-driven prices.
                </p>
                <p style={{ fontSize: 16, marginBottom: 24 }}>
                  We purchase both complete industrial plants and individual machines from forging, gear manufacturing, bearing, grinding, turning, and fabrication facilities. With a large, ready-to-inspect physical inventory in Navi Mumbai, we make it easier for buyers to find dependable second-hand machinery that meets their operational requirements.
                </p>
                <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
                  {['Sourced from Japan, Germany, Switzerland & Italy', 'Every machine tested under power & geometry-checked', 'Transparent make, model, year & origin records', 'Full export crating, documentation & logistics'].map((t) => (
                    <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <CheckCircle2 size={19} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>{t}</span>
                    </div>
                  ))}
                </div>
                <Link href="/products" className="btn btn-primary">Browse Products <ArrowRight size={16} /></Link>
              </div>
            </Reveal>

            <Reveal delay={140} scale>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {products.map((p, i) => (
                  <div key={p.id} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', aspectRatio: '1 / 1', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', transform: i % 2 === 1 ? 'translateY(26px)' : undefined, background: '#eef1f4' }}>
                    {p.images?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl(p.images[0])} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-sm">
        <div className="container">
          <div className="stats-grid surface" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center', padding: 'clamp(28px, 4vw, 48px)', borderRadius: 'var(--radius-xl)' }}>
            {[
              { icon: Award, to: 30, suffix: '+', label: 'Years in business' },
              { icon: Building2, to: total, suffix: '+', label: 'Machines catalogued' },
              { icon: Globe, to: 25, suffix: '+', label: 'Countries served' },
              { icon: ShieldCheck, to: 1500, suffix: '+', label: 'Buyers served', format: true },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div>
                  <s.icon size={26} style={{ color: 'var(--accent)', marginBottom: 12 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, lineHeight: 1 }}>
                    <Counter to={s.to} suffix={s.suffix} format={s.format} />
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section band-paper">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow" style={{ marginBottom: 10 }}>What sets us apart</span>
              <h2>The difference is what we refuse to sell</h2>
              <p>Anyone can list a machine. We stake three decades of reputation on the ones that pass inspection.</p>
            </div>
          </Reveal>
          <div className="ind-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={(i % 4) * 70}>
                <div className="surface" style={{ padding: 26, height: '100%', borderRadius: 'var(--radius-xl)' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', marginBottom: 18 }}>
                    <v.icon size={24} />
                  </span>
                  <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8 }}>{v.title}</h3>
                  <p style={{ fontSize: 13.5 }}>{v.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Machinery range */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow" style={{ marginBottom: 10 }}>What we stock</span>
              <h2>Our machinery range</h2>
              <p>From conventional toolroom machines to CNC centres and heavy sheet-metal presses.</p>
            </div>
          </Reveal>
          <div className="ind-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {RANGE.map((r, i) => (
              <Reveal key={r.title} delay={(i % 4) * 70}>
                <div className="surface" style={{ padding: 26, height: '100%', borderRadius: 'var(--radius-xl)' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--secondary-soft)', color: 'var(--secondary)', marginBottom: 18 }}>
                    <r.icon size={24} />
                  </span>
                  <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8 }}>{r.title}</h3>
                  <p style={{ fontSize: 13.5 }}>{r.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section className="section band-dark">
        <div className="container">
          <Reveal>
            <div style={{ maxWidth: 620, marginBottom: 48 }}>
              <span className="eyebrow" style={{ marginBottom: 12, color: 'var(--accent)' }}>How we work</span>
              <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3.4vw, 40px)' }}>From foreign floor to your shop</h2>
            </div>
          </Reveal>
          <div className="proc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
            {TIMELINE.map((step, i) => (
              <Reveal key={step.n} delay={i * 90}>
                <div style={{ position: 'relative', paddingTop: 26 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>{step.n}</div>
                  <h3 style={{ fontSize: 16.5, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 13.5, color: 'rgba(238,241,244,0.66)' }}>{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <Reveal scale>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-2xl)', padding: 'clamp(40px, 6vw, 72px)', textAlign: 'center', background: 'var(--accent)', color: '#fff' }}>
              <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 44px)', marginBottom: 14, maxWidth: 720, marginInline: 'auto' }}>
                Looking for a specific machine? We probably have it — or can source it.
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.88)', maxWidth: 520, margin: '0 auto 30px' }}>
                Tell us the make, model or category and we&apos;ll respond with availability and the best price.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/products" className="btn btn-dark btn-lg">Browse Products <ArrowRight size={18} /></Link>
                <a href={WA} target="_blank" rel="noopener noreferrer" className="btn btn-lg" style={{ background: '#fff', color: 'var(--accent)' }}><MessageCircle size={18} /> WhatsApp us</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
