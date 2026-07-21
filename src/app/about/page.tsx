import Link from 'next/link';
import {
  ChevronRight, ArrowRight, CheckCircle2, ShieldCheck, Globe, Truck,
  Search, Wrench, Cog, Hammer, Layers, Award, Building2, MessageCircle,
} from 'lucide-react';
import Reveal from '@/components/Reveal';
import Counter from '@/components/Counter';
import { getLatestArrivals, getTotalMachines } from '@/lib/products';
import { imageUrl } from '@/lib/images';

export const revalidate = 3600;

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

const VALUES = [
  { icon: Search, title: 'Find the Right Machine', body: 'Explore suitable machinery based on your application, specifications, and specific requirements.' },
  { icon: Globe, title: 'Clear & Honest Information', body: 'Get straightforward details about machine specifications, condition, history, and suitability.' },
  { icon: ShieldCheck, title: 'Quality You Can Rely On', body: 'Explore carefully selected pre-owned machinery from trusted Indian and international sources.' },
  { icon: Truck, title: 'Support from Enquiry to Delivery', body: 'Get assistance throughout the process, from your initial enquiry to documentation, logistics, and delivery.' },
];

const RANGE = [
  { icon: Wrench, title: 'Conventional workshop', body: 'Reliable machines for turning, milling, drilling, boring, shaping, and general workshop applications.' },
  { icon: Cog, title: 'CNC & automatics', body: 'Explore CNC and automated machines for precision manufacturing and production requirements.' },
  { icon: Layers, title: 'Grinding specialists', body: 'Machines for precision grinding, cylindrical grinding, surface grinding, and other finishing applications.' },
  { icon: Hammer, title: 'Sheet metal & presses', body: 'Explore machines for forming, bending, pressing, cutting, and sheet-metal requirements.' },
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
      {/* Header band */}
      <div className="band-paper" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ padding: '30px 20px 36px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>About Us</span>
          </nav>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginBottom: 10 }}>
            Your Trusted Partner for Quality Pre-Owned Machinery
          </h1>
          <p style={{ fontSize: 16, maxWidth: 640 }}>
            Explore quality pre-owned machinery or tell us exactly what you are looking for. We help you discover suitable machines based on your application, specifications, and requirements.
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
                  A Trusted Name in <span className="text-accent">Pre-Owned Machinery</span>
                </h2>
                <p style={{ fontSize: 16, marginBottom: 16, textAlign: 'justify' }}>
                  Ajmera Enterprise is part of the AJMERA Group, with over 30 years of experience in buying, stocking, and selling quality pre-owned industrial machinery. Built on fair business practices and a commitment to keeping our word, the AJMERA name has earned the trust of customers and established a strong reputation among India's recognised second-hand machinery dealers.
                </p>
                <p style={{ fontSize: 16, marginBottom: 24, textAlign: 'justify' }}>
                  We source and stock quality Indian and imported engineering workshop, tool-room, sheet-metal, and specialised machinery, as well as complete industrial plants. From forge shops and gear manufacturing to bearing production, grinding media, turning, and sheet-metal operations, our experience spans a wide range of industrial applications.
                </p>
                <p style={{ fontSize: 16, marginBottom: 24, textAlign: 'justify' }}>
                  Whether you are looking to buy, sell, or source a specific machine, we help make the process more transparent, straightforward, and dependable.
                </p>
                <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
                  {['Find machines based on your specific requirement', 'Get clear information about machine condition and specifications', 'Explore suitable options from a wide range of machinery', 'Get practical guidance when you need it', 'Receive support from enquiry to delivery'].map((t) => (
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
              <span className="eyebrow" style={{ marginBottom: 10 }}>What you can expect from us</span>
              <h2>Making Your Machinery Search Simpler</h2>
              <p>From finding the right machine to understanding your options, we help you move forward with clear information, practical guidance, and dependable support.</p>
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
              <h2>Explore Machines for Your Application</h2>
              <p>Find suitable machinery across a wide range of industrial applications.</p>
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
