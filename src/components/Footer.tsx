'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Globe, Award, Headphones, ChevronRight,
  MapPin, Phone, Mail, ArrowRight, Send, ArrowUp, Shield,
} from 'lucide-react';

/* ============================================================================
   Footer — premium dark theme matching the reference design, built on the
   site's existing design tokens (CSS variables) + Framer Motion for subtle
   hover micro-interactions. Fully responsive (desktop / tablet / mobile).
   ========================================================================= */

const RED = 'var(--hot)';
const MUTED = 'rgba(238,241,244,0.62)';
const BORDER = 'rgba(255,255,255,0.08)';

const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

const USPS = [
  { Icon: ShieldCheck, title: 'Inspected & Verified', note: 'Every machine is quality checked before listing' },
  { Icon: Globe, title: 'Worldwide Export', note: 'Exporting machinery to 25+ countries globally' },
  { Icon: Award, title: '30+ Years Trusted', note: 'Serving industries with excellence since 1990' },
  { Icon: Headphones, title: 'Fast Enquiry Reply', note: 'Quick response within hours, every time' },
];

const COMPANY: [string, string][] = [
  ['Home', '/'],
  ['About Us', '/about'],
  ['Products', '/products'],
  ['Contact Us', '/contact'],
];

const CATEGORIES: [string, string][] = [
  ['Surface Grinders', '/products?category=Grinder%20Surface'],
  ['Vertical Turret Lathes', '/products?category=VTL'],
  ['Press Brakes', '/products?category=Press%20Brake'],
  ['Bed Milling', '/products?category=Milling%20Bed'],
  ['Radial Drills', '/products?category=Drill%20Radial'],
  ['Gear Hobbing', '/products?category=Gear%20Hobbing'],
  ['View All Categories', '/products'],
];

/* ---- Inline brand-social glyphs (this lucide build has no brand icons) ---- */
type SvgProps = { size?: number };
const FacebookGlyph = ({ size = 17 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22C18.34 21.21 22 17.06 22 12.06Z" /></svg>
);
const InstagramGlyph = ({ size = 17 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" /></svg>
);
const LinkedinGlyph = ({ size = 17 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.94 5a2 2 0 1 1-4.001-.001A2 2 0 0 1 6.94 5ZM3.2 8.6h3.48V21H3.2V8.6Zm5.7 0h3.34v1.7h.05c.46-.88 1.6-1.8 3.29-1.8 3.52 0 4.17 2.31 4.17 5.32V21h-3.48v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21H8.9V8.6Z" /></svg>
);
const YoutubeGlyph = ({ size = 17 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.76-1.77C19.34 5.1 12 5.1 12 5.1s-7.34 0-8.84.43A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.76 1.77c1.5.43 8.84.43 8.84.43s7.34 0 8.84-.43A2.5 2.5 0 0 0 22.6 16.7C23 15.2 23 12 23 12ZM9.75 15.5v-7l6 3.5-6 3.5Z" /></svg>
);
const TwitterGlyph = ({ size = 16 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M22 5.9c-.74.33-1.53.55-2.36.65a4.12 4.12 0 0 0 1.8-2.27c-.8.47-1.68.82-2.62 1a4.1 4.1 0 0 0-7.03 3.74A11.65 11.65 0 0 1 3.4 4.75a4.1 4.1 0 0 0 1.27 5.49c-.65-.02-1.27-.2-1.81-.5v.05a4.11 4.11 0 0 0 3.29 4.03c-.56.15-1.16.17-1.73.07a4.11 4.11 0 0 0 3.83 2.85A8.24 8.24 0 0 1 2 18.4a11.62 11.62 0 0 0 6.29 1.84c7.55 0 11.68-6.26 11.68-11.68l-.01-.53A8.3 8.3 0 0 0 22 5.9Z" /></svg>
);
const PinterestGlyph = ({ size = 17 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.63 7.85 6.34 9.29-.09-.79-.17-2 .03-2.87.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.8-2.43 1.8-2.43.85 0 1.26.64 1.26 1.41 0 .86-.55 2.14-.83 3.33-.24 1 .5 1.81 1.48 1.81 1.78 0 3.14-1.88 3.14-4.58 0-2.39-1.72-4.07-4.18-4.07-2.85 0-4.52 2.14-4.52 4.35 0 .86.33 1.79.75 2.29a.3.3 0 0 1 .07.29c-.08.32-.25 1-.28 1.14-.05.18-.15.22-.34.13-1.25-.58-2.03-2.4-2.03-3.87 0-3.15 2.29-6.04 6.6-6.04 3.47 0 6.16 2.47 6.16 5.77 0 3.45-2.17 6.22-5.19 6.22-1.01 0-1.97-.53-2.29-1.15l-.62 2.38c-.23.86-.83 1.94-1.24 2.6.94.29 1.92.44 2.95.44 5.52 0 10-4.48 10-10S17.52 2 12 2Z" /></svg>
);
const WhatsappGlyph = ({ size = 18 }: SvgProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden><path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.08-.3-.15-1.26-.47-2.4-1.48-.89-.8-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35ZM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.25A10 10 0 1 0 12 2Z" /></svg>
);

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/Ajmera-Enterprise-1687830964848538', Glyph: FacebookGlyph },
  { label: 'Twitter', href: 'https://twitter.com/Ajmera_E', Glyph: TwitterGlyph },
  { label: 'Instagram', href: 'https://www.instagram.com/ajmera_enterprise/', Glyph: InstagramGlyph },
  { label: 'Pinterest', href: 'https://in.pinterest.com/ajmeraenterprise/', Glyph: PinterestGlyph },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/milan-ajmera-a3015a13/', Glyph: LinkedinGlyph },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UC5T7NF6DRqDvlj224nO_fbg/videos', Glyph: YoutubeGlyph },
];

/* ---- Section heading with the red underline accent ---- */
function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 22, position: 'relative', paddingBottom: 12 }}>
      {children}
      <span style={{ position: 'absolute', left: 0, bottom: 0, width: 34, height: 3, background: RED, borderRadius: 2 }} />
    </h4>
  );
}

/* ---- Link row: red chevron + text, slides on hover ---- */
function NavLink({ label, href }: { label: string; href: string }) {
  return (
    <motion.li whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
      <Link href={href} className="footer-navlink" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
        <ChevronRight size={14} style={{ color: RED, flexShrink: 0 }} />
        <span>{label}</span>
      </Link>
    </motion.li>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [newsMsg, setNewsMsg] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setNewsMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) { setSubscribed(true); setNewsMsg(data.message || "You're on the list."); }
      else setNewsMsg(data.error || 'Please try again.');
    } catch {
      setNewsMsg('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer style={{ marginTop: 'auto', color: MUTED }}>
      {/* ============ Trust / USP band ============ */}
      <div style={{ background: 'radial-gradient(70% 130% at 22% 0%, rgba(46,116,180,0.32), transparent 55%), linear-gradient(180deg, #0e2c49 0%, #0a1220 100%)', borderBottom: `1px solid ${BORDER}` }}>
        <div className="container footer-usp" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '30px 20px' }}>
          {USPS.map(({ Icon, title, note }) => (
            <motion.div key={title} className="footer-usp-item" whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 54, height: 54, borderRadius: '50%', border: '1px solid rgba(120,164,214,0.35)', background: 'rgba(120,164,214,0.08)', color: '#7ea6d8', flexShrink: 0 }}>
                <Icon size={23} strokeWidth={1.75} />
              </span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(238,241,244,0.55)', lineHeight: 1.45 }}>{note}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ============ Main footer ============ */}
      <div style={{ background: '#080b12' }}>
        <div className="container" style={{ padding: '60px 20px 40px' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1fr 1.4fr', gap: 40 }}>
            {/* Brand */}
            <div className="footer-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://res.cloudinary.com/z5xktswf/image/upload/f_auto,q_auto,w_760/v1784268556/ajmera/homepage/ajmera-logo-footer.png" alt="Ajmera Enterprise" width={362} height={90} loading="lazy" decoding="async" style={{ height: 90, width: 'auto', objectFit: 'contain', display: 'block', marginBottom: 22 }} />
              <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 320, marginBottom: 24, color: 'rgba(238,241,244,0.66)', textAlign: 'justify' }}>
                Trusted importer &amp; dealer of quality used machinery including CNC, VMC,
                Press Brakes, Lathes, and more. We deliver performance, value, and reliability
                with every machine.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {SOCIALS.map(({ label, href, Glyph }) => (
                  <motion.a
                    key={label} href={href} aria-label={label}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="footer-social"
                    whileHover={{ y: -3 }} whileTap={{ scale: 0.94 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: '#cfd6de' }}
                  >
                    <Glyph />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Company */}
            <nav aria-label="Company">
              <ColHeading>Company</ColHeading>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 13 }}>
                {COMPANY.map(([label, href]) => <NavLink key={label} label={label} href={href} />)}
              </ul>
            </nav>

            {/* Categories */}
            <nav aria-label="Categories">
              <ColHeading>Categories</ColHeading>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 13 }}>
                {CATEGORIES.map(([label, href]) => <NavLink key={label} label={label} href={href} />)}
              </ul>
            </nav>

            {/* Get in Touch */}
            <div>
              <ColHeading>Get in Touch</ColHeading>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.55, color: 'rgba(238,241,244,0.66)' }}>
                  <MapPin size={18} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
                  <span>Plot R-258, MIDC, TTC Industrial Area, Rabale, Navi Mumbai 400701, India</span>
                </li>
                <li style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13.5 }}>
                  <Phone size={18} style={{ color: RED, flexShrink: 0 }} />
                  <a href="tel:+919322401398" className="footer-contact">+91 93224 01398 &nbsp;•&nbsp; +91 22 2769 8822</a>
                </li>
                <li style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13.5 }}>
                  <Mail size={18} style={{ color: RED, flexShrink: 0 }} />
                  <a href="mailto:ajmeraenterprise@gmail.com" className="footer-contact">ajmeraenterprise@gmail.com</a>
                </li>
              </ul>
              <motion.a
                href={WA} target="_blank" rel="noopener noreferrer"
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginTop: 22, padding: '13px 18px', minWidth: 210, borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.02)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><WhatsappGlyph /> Chat on WhatsApp</span>
                <ArrowRight size={16} />
              </motion.a>
            </div>
          </div>

          {/* ============ Newsletter card ============ */}
          <div className="footer-news" style={{ marginTop: 48, background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))', border: `1px solid ${BORDER}`, borderRadius: 18, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(120,164,214,0.1)', border: '1px solid rgba(120,164,214,0.28)', color: '#7ea6d8', flexShrink: 0 }}>
                <Mail size={24} strokeWidth={1.75} />
              </span>
              <div>
                <h3 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 5, lineHeight: 1.2 }}>Subscribe to Our Newsletter</h3>
                <p style={{ fontSize: 14, color: 'rgba(238,241,244,0.6)' }}>Get latest arrivals, offers &amp; industry updates directly in your inbox.</p>
              </div>
            </div>

            {subscribed ? (
              <p role="status" className="footer-newsform" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#fff', fontWeight: 600, fontSize: 14.5, flex: '0 1 460px' }}>
                <ShieldCheck size={18} style={{ color: '#22C55E' }} /> {newsMsg || "Thanks — you're on the list."}
              </p>
            ) : (
              <form
                className="footer-newsform"
                onSubmit={handleSubscribe}
                style={{ display: 'flex', gap: 12, flex: '0 1 460px', minWidth: 260, flexWrap: 'wrap' }}
              >
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <input
                    suppressHydrationWarning type="email" required aria-label="Email address"
                    placeholder="Enter your email address"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="footer-input"
                    style={{ flex: 1, height: 52, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: '#fff', padding: '0 16px', fontSize: 14, minWidth: 0 }}
                  />
                  <motion.button
                    type="submit" disabled={sending} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 52, padding: '0 24px', borderRadius: 10, background: RED, color: '#fff', border: 'none', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: sending ? 'progress' : 'pointer', opacity: sending ? 0.8 : 1, whiteSpace: 'nowrap' }}
                  >
                    {sending ? 'Sending…' : <>Subscribe <Send size={16} /></>}
                  </motion.button>
                </div>
                {newsMsg && <span role="status" style={{ fontSize: 12.5, color: 'rgba(238,241,244,0.75)', width: '100%' }}>{newsMsg}</span>}
              </form>
            )}
          </div>
        </div>

        {/* ============ Bottom bar ============ */}
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          <div className="container footer-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 20px' }}>
            <p style={{ fontSize: 13, color: 'rgba(238,241,244,0.5)', margin: 0 }}>© {year} Ajmera Enterprise. All Rights Reserved.</p>

            {/* <div className="footer-legal" style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'rgba(238,241,244,0.58)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Shield size={15} style={{ color: 'rgba(238,241,244,0.45)' }} /> Inspected &amp; Verified Stock</span>
              <span style={{ opacity: 0.35 }}>•</span>
              <Link href="/products" className="footer-contact">Stocklist</Link>
              <span style={{ opacity: 0.35 }}>•</span>
              <Link href="/contact" className="footer-contact">Contact</Link>
            </div> */}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link href="https://bdm.co.in" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(238,241,244,0.55)' }}>
                <span>Designed by</span>
                <Image src="https://res.cloudinary.com/z5xktswf/image/upload/f_auto,q_auto,w_208/v1784268557/ajmera/homepage/bdm-logo.png" alt="BDM CLOUDTECH" width={104} height={22} unoptimized style={{ height: 22, width: 'auto' }} />
              </Link>
              <motion.button
                type="button" onClick={scrollTop} aria-label="Back to top"
                whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: RED, color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: '0 8px 20px -6px rgba(255,0,0,0.5)' }}
              >
                <ArrowUp size={18} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- hover states + responsive rules (scoped to the footer) ---- */}
      <style>{`
        footer .footer-navlink span,
        footer .footer-contact { transition: color .2s ease; }
        footer .footer-navlink:hover span { color: #fff; }
        footer .footer-contact:hover { color: #fff; }
        footer .footer-social { transition: background .2s ease, color .2s ease, border-color .2s ease; }
        footer .footer-social:hover { background: var(--hot); color: #fff; border-color: var(--hot); }
        footer .footer-input::placeholder { color: rgba(238,241,244,0.4); }
        footer .footer-input:focus { outline: none; border-color: var(--hot); background: rgba(255,255,255,0.05); }

        /* dividers between USP items */
        footer .footer-usp-item { border-left: 1px solid rgba(255,255,255,0.08); padding-left: 28px; }
        footer .footer-usp-item:first-child { border-left: none; padding-left: 0; }

        @media (max-width: 1024px) {
          footer .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 36px 32px !important; }
          footer .footer-brand { grid-column: 1 / -1; }
          footer .footer-usp { grid-template-columns: 1fr 1fr !important; gap: 26px 24px; }
          footer .footer-usp-item:nth-child(2n+1) { border-left: none; padding-left: 0; }
        }
        @media (max-width: 860px) {
          footer .footer-news { flex-direction: column; align-items: flex-start; gap: 22px; }
          footer .footer-newsform { flex: 1 1 auto !important; width: 100%; align-self: stretch; }
          footer .footer-bottom { flex-direction: column; text-align: center; gap: 16px; }
          footer .footer-legal { flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 560px) {
          footer .footer-grid { grid-template-columns: 1fr !important; }
          footer .footer-usp { grid-template-columns: 1fr !important; }
          footer .footer-usp-item { border-left: none !important; padding-left: 0 !important; }
          footer .footer-news { padding: 24px 20px; }
          footer .footer-newsform { flex-direction: column; }
          footer .footer-newsform button { justify-content: center; }
        }
      `}</style>
    </footer>
  );
}
