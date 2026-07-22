import Link from 'next/link';
import {
  ChevronRight, ArrowRight, CheckCircle2, ShieldCheck, Globe, Truck,
  Search, Wrench, Cog, Hammer, Layers, Award, Building2, MessageCircle,
  CircleDot, Factory, Handshake,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import Counter from '@/components/Counter';
import { getLatestArrivals, getTotalMachines } from '@/lib/products';
import { imageUrl } from '@/lib/images';

export const revalidate = 3600;

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

const VALUES = [
  { icon: Search, title: 'Find the Right Machine', body: 'Explore suitable machinery based on your application, specifications, and specific requirements.' },
  { icon: Globe, title: 'Clear & Honest Information', body: 'Get straightforward details about machine specifications, condition and suitability.' },
  { icon: ShieldCheck, title: 'Quality You Can Rely On', body: 'Explore carefully selected pre-owned machinery from trusted Indian and international sources.' },
  { icon: Truck, title: 'Support from Enquiry to Delivery', body: 'Get assistance throughout the process, from your initial enquiry to documentation, logistics, and delivery.' },
];

const RANGE = [
  { icon: Hammer, title: 'Forge Shops', body: 'Presses and hammers for forging applications.' },
  { icon: Cog, title: 'Gear Manufacturing', body: 'Gear hobbing, shaping, bevel gear, gear grinding, gear testing, and thread milling machines.' },
  { icon: CircleDot, title: 'Bearing Manufacturing', body: 'Centreless, cylindrical, and internal grinders, plus superfinishing and forming machines.' },
  { icon: Wrench, title: 'Metalworking', body: 'Boring machines, VTLs, lathes, mills, drilling machines, bandsaws, presses, and press brakes.' },
  { icon: Layers, title: 'Grinding & Finishing', body: 'Surface, cylindrical, gear, thread, centreless, and tool & cutter grinders, plus honing machines.' },
  { icon: Factory, title: 'Complete Industrial Solutions', body: 'CNC and conventional machinery for workshops, forging, tool rooms, and sheet-metal plants.' },
];

const PARTNERSHIPS = [
  { icon: Globe, title: 'Global Sourcing', body: 'Procuring specific industrial materials, machinery, and products.' },
  { icon: Building2, title: 'Market Entry & Representation', body: 'Supporting international companies looking to establish or develop their presence in the Indian market.' },
  { icon: Handshake, title: 'Strategic Alliances', body: 'Exploring joint ventures, partnerships, and customised business opportunities.' },
];

const TIMELINE = [
  { n: '01', title: 'Tell Us What You Need', body: 'Share your application, specifications, preferred machine, or production requirement.' },
  { n: '02', title: 'Explore Suitable Options', body: 'We help you identify available machines or explore suitable alternatives.' },
  { n: '03', title: 'Understand the Machine', body: 'Get clear information about specifications, condition, images, and relevant details.' },
  { n: '04', title: 'Make Your Decision', body: 'Compare your options and move forward with the machine that best fits your requirement.' },
  { n: '05', title: 'Get Support Through the Process', body: 'Receive assistance from initial enquiry through documentation, logistics, and delivery.' },
];

export default async function AboutPage() {
  const products = await getLatestArrivals(4);
  const total = getTotalMachines();

  return (
    <div>
      {/* Header band — page intro */}
      <div className="band-paper" style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border-light)' }}>
        <div aria-hidden style={{ position: 'absolute', top: -150, right: -110, width: 420, height: 420, borderRadius: '50%', background: 'var(--accent)', opacity: 0.07 }} />
        <div aria-hidden style={{ position: 'absolute', bottom: -170, left: -130, width: 360, height: 360, borderRadius: '50%', background: 'var(--secondary)', opacity: 0.05 }} />
        <div className="container" style={{ position: 'relative', padding: 'clamp(30px, 5vw, 56px) 20px clamp(34px, 5vw, 58px)' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link>
            <ChevronRight size={13} style={{ opacity: 0.6 }} />
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>About Us</span>
          </nav>
          <span className="eyebrow" style={{ marginBottom: 16 }}>Corporate profile</span>
          <h1 className="display" style={{ fontSize: 'clamp(30px, 4.6vw, 54px)', letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 16, maxWidth: 760 }}>
            About <span className="text-accent">Ajmera Enterprise</span>
          </h1>
          <p style={{ fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'var(--text-secondary)', maxWidth: 680, lineHeight: 1.7 }}>
            A proud group company of AJMERA and one of India&apos;s established importers, exporters and dealers of pre-owned engineering, conventional, CNC and metalworking machinery — and complete industrial plants.
          </p>
        </div>
      </div>

      {/* Our Story — editorial */}
      <section className="section">
        <div className="container">
          {/* Intro + image composition */}
          <div className="intro-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 'clamp(32px, 5vw, 72px)', alignItems: 'center' }}>
            <Reveal>
              <div>
                <span className="eyebrow" style={{ marginBottom: 16 }}>Our story</span>
                <h2 style={{ fontSize: 'clamp(26px, 3.6vw, 42px)', lineHeight: 1.08, marginBottom: 20 }}>
                  Built on Experience.<br /><span className="text-accent">Driven by Trust.</span>
                </h2>
                <p style={{ fontSize: 16, marginBottom: 16, textAlign: 'justify' }}>
                  Ajmera Enterprise is a proud group company of AJMERA and one of India&apos;s established importers, exporters, and dealers of pre-owned engineering, conventional, CNC, metalworking machinery, and complete industrial plants.
                </p>
                <p style={{ fontSize: 16, marginBottom: 24, textAlign: 'justify' }}>
                  With 40 years of industry experience, we have built our reputation on fair business practices, integrity, and a commitment to keeping our word. Over the years, this focus on trust and long-term relationships has helped us establish a strong presence in India&apos;s used machinery market.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
                  {['40+ years of experience', 'Fair business practices', 'Trusted relationships', 'Global sourcing capability'].map((t) => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--radius-pill)', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                      <CheckCircle2 size={15} /> {t}
                    </span>
                  ))}
                </div>
                <Link href="/products" className="btn btn-primary">Browse Products <ArrowRight size={16} /></Link>
              </div>
            </Reveal>

            <Reveal delay={140} scale>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'stretch' }}>
                  {products[0]?.images?.[0] && (
                    <div style={{ gridRow: '1 / span 2', minHeight: 220, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)', background: '#eef1f4' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(products[0].images[0])} alt={products[0].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  {products.slice(1, 3).map((p) => (
                    <div key={p.id} style={{ aspectRatio: '1 / 1', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', background: '#eef1f4' }}>
                      {p.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl(p.images[0])} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', left: 16, bottom: 16, background: 'var(--dark)', color: '#fff', padding: '12px 18px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>40+</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.82, marginTop: 2 }}>Years of trust</div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Strategic Sourcing & Partnerships */}
          <div style={{ marginTop: 'clamp(48px, 7vw, 84px)' }}>
            <Reveal>
              <div style={{ maxWidth: 720, marginBottom: 30 }}>
                <span className="eyebrow" style={{ marginBottom: 10 }}>Beyond buying &amp; selling</span>
                <h2 style={{ fontSize: 'clamp(23px, 3vw, 34px)', marginBottom: 12 }}>Strategic Sourcing &amp; Partnerships</h2>
                <p style={{ fontSize: 15.5, textAlign: 'justify' }}>
                  Our decades of experience and strong industry relationships enable us to support businesses with specialised sourcing and partnership opportunities.
                </p>
              </div>
            </Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
              {PARTNERSHIPS.map((pt, i) => (
                <Reveal key={pt.title} delay={i * 80}>
                  <div className="surface" style={{ padding: 26, height: '100%', borderRadius: 'var(--radius-xl)' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', marginBottom: 18 }}>
                      <pt.icon size={24} />
                    </span>
                    <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 8 }}>{pt.title}</h3>
                    <p style={{ fontSize: 13.5 }}>{pt.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal>
              <p style={{ marginTop: 22, fontSize: 15, color: 'var(--text-secondary)', maxWidth: 720 }}>
                We welcome mutually beneficial proposals and invite businesses to connect with us to explore potential opportunities.
              </p>
            </Reveal>
          </div>

          {/* Core Capabilities — highlighted overview */}
          <div style={{ marginTop: 'clamp(48px, 7vw, 84px)' }}>
            <Reveal scale>
              <div className="surface" style={{ padding: 'clamp(24px, 4vw, 44px)', borderRadius: 'var(--radius-xl)', borderLeft: '3px solid var(--accent)' }}>
                <span className="eyebrow" style={{ marginBottom: 10 }}>What we deal in</span>
                <h2 style={{ fontSize: 'clamp(23px, 3vw, 34px)', marginBottom: 14 }}>Core Capabilities</h2>
                <p style={{ fontSize: 16, marginBottom: 14, textAlign: 'justify', maxWidth: 880 }}>
                  Our primary business focuses on sourcing, importing, exporting, and trading quality Indian and imported machinery for engineering workshops, tool rooms, sheet-metal industries, and complete industrial plants.
                </p>
                <p style={{ fontSize: 16, textAlign: 'justify', maxWidth: 880 }}>
                  We actively purchase and deal in both individual machines and complete manufacturing plants — from forge shops and gear manufacturing to bearing production, metalworking, grinding and finishing, and complete industrial solutions.
                </p>
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
              { icon: Award, to: 40, suffix: '+', label: 'Years in business' },
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
              <span className="eyebrow" style={{ marginBottom: 10 }}>What you can expect from us</span>
              <h2>Building Trust Through Transparency and Expertise</h2>
              <p>From finding the right machinery to navigating international sourcing and partnerships, we provide clear information, practical guidance, and dependable support at every step.</p>
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
              <h2>Sectors We Source and Supply For</h2>
              <p>We buy, sell, and deal in individual machines and complete manufacturing plants across these industrial sectors.</p>
            </div>
          </Reveal>
          <div className="ind-grid ind-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {RANGE.map((r, i) => (
              <Reveal key={r.title} delay={(i % 3) * 70}>
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
              <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 3.4vw, 40px)' }}>From Your Requirement to the Right Machine</h2>
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
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-2xl)', padding: 'clamp(40px, 6vw, 72px)', textAlign: 'center', background: 'var(--dark)', color: '#fff' }}>
              <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 44px)', marginBottom: 14, maxWidth: 720, marginInline: 'auto' }}>
                Looking for the Right Machine?
              </h2>
              <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.88)', maxWidth: 520, margin: '0 auto 30px' }}>
                Tell us what you need. We'll help you find the right option for your requirement.
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