import Link from 'next/link';
import EnquiryForm from '@/components/EnquiryForm';
import {
  Mail, Phone, MapPin, Clock, ExternalLink, MessageCircle,
  ChevronRight, ShieldCheck, Truck, BadgeCheck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const ADDRESS = 'Plot No. R-258, MIDC, TTC Industrial Area, Thane Belapur Road, Rabale, Navi Mumbai 400701, Maharashtra, India';
const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent('Rabale MIDC TTC Industrial Area Navi Mumbai')}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

const METHODS = [
  { icon: Phone, label: 'Call us', value: '+91 93224 01398', href: 'tel:+919322401398', tone: 'var(--accent)' },
  { icon: MessageCircle, label: 'WhatsApp', value: 'Chat instantly', href: 'https://api.whatsapp.com/send?phone=919322401398', tone: '#25d366' },
  { icon: Mail, label: 'Email', value: 'ajmeraenterprise@gmail.com', href: 'mailto:ajmeraenterprise@gmail.com', tone: 'var(--secondary)' },
];

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ enquiry?: string; stock?: string; requirement?: string }> }) {
  const { enquiry, stock, requirement } = await searchParams;

  return (
    <div>
      {/* Header band */}
      <div className="band-paper" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="container" style={{ padding: '30px 20px 36px' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            <Link href="/">Home</Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Contact</span>
          </nav>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 4vw, 46px)', marginBottom: 10 }}>
            Let&apos;s find your <span className="text-accent">machine</span>
          </h1>
          <p style={{ fontSize: 16, maxWidth: 620 }}>
            Enquiring about a specific machine, or want to sell your factory equipment?
            Reach out — we reply fast, with the best price and honest condition details.
          </p>
        </div>
      </div>

      {/* Quick contact methods */}
      <div className="container" style={{ padding: '32px 20px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }} className="promo-grid">
          {METHODS.map((m) => (
            <a key={m.label} href={m.href} target={m.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
              className="surface" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 'var(--radius-lg)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 50, height: 50, borderRadius: 14, background: 'var(--accent-soft)', color: m.tone, flexShrink: 0 }}>
                <m.icon size={24} />
              </span>
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{m.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{m.value}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="container" style={{ padding: '36px 20px 64px' }}>
        <div className="contact-layout" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 40, alignItems: 'start' }}>
          {/* Left: details + map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="surface" style={{ padding: 30, borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 22 }}>Ajmera Enterprise HQ</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <li style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <MapPin size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>Warehouse &amp; showroom</h4>
                    <p style={{ fontSize: 14 }}>{ADDRESS}</p>
                  </div>
                </li>
                <li style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <Phone size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>Phone &amp; mobile</h4>
                    <p style={{ fontSize: 14 }}>+91 93224 01398<br />+91 22 2769 8822</p>
                  </div>
                </li>
                <li style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <Clock size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>Business hours</h4>
                    <p style={{ fontSize: 14 }}>Mon–Sat: 10:00 AM – 6:30 PM<br />Sunday: Closed</p>
                  </div>
                </li>
              </ul>
              <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                <a href="https://maps.google.com/?q=Rabale+MIDC+Navi+Mumbai" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: '1 1 180px', justifyContent: 'center' }}>
                  Open in Google Maps <ExternalLink size={14} />
                </a>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Ajmera Enterprise HQ\n${ADDRESS}\nhttps://maps.app.goo.gl/mG64FJ7QsU6ycTCT6`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp" style={{ flex: '1 1 180px', justifyContent: 'center' }}>
                  <MessageCircle size={16} /> Share location
                </a>
              </div>
            </div>

            {/* Map embed */}
            <div className="surface" style={{ padding: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <iframe
                src={MAP_SRC}
                title="Ajmera Enterprise location"
                style={{ width: '100%', height: 260, border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Trust row */}
            <div className="surface" style={{ padding: 18, borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-around', gap: 10, flexWrap: 'wrap' }}>
              {[[ShieldCheck, 'Inspected stock'], [Truck, 'Worldwide export'], [BadgeCheck, '30+ yrs trusted']].map(([Icon, label], i) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <I size={17} style={{ color: 'var(--accent)' }} /> {label as string}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right: form (prefilled from query) */}
          <EnquiryForm productTitle={enquiry} stockNo={stock} initialMessage={requirement} />
        </div>
      </div>
    </div>
  );
}
