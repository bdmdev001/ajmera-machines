'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Menu, X, Phone, Mail, ChevronDown, MessageCircle,
  LayoutGrid, ArrowRight, Clock, Truck, ShieldCheck,
} from 'lucide-react';
import SearchBar from './SearchBar';
import type { SearchIndex } from '@/lib/products';

const LOGO = 'https://res.cloudinary.com/z5xktswf/image/upload/f_auto,q_auto,w_640/v1784268554/ajmera/homepage/ajmera-logo.webp';
const WA = 'https://api.whatsapp.com/send?phone=919322401398&text=Hi,%20I%20would%20like%20to%20enquire%20about%20a%20machine.';

const NAV = [
  { name: 'Home', path: '/' },
  { name: 'About Us', path: '/about' },
  { name: 'Products', path: '/products' },
  { name: 'Contact', path: '/contact' },
];

const MEGA: { group: string; items: string[] }[] = [
  { group: 'Grinding', items: ['Grinder Surface', 'Grinder Cylindrical', 'Grinder Centreless', 'Grinder Internal', 'Grinder Tool & Cutter'] },
  { group: 'Turning', items: ['VTL', 'Lathe', 'Lathe Facing'] },
  { group: 'Milling', items: ['Milling Bed', 'Milling Univeersal', 'Milling Turret'] },
  { group: 'Sheet Metal', items: ['Press Brake', 'Shearing', 'Press', 'Notching'] },
  { group: 'Drilling & Boring', items: ['Drill Radial', 'Boring', 'Gun Drilling'] },
  { group: 'Gear Cutting', items: ['Gear Hobbing', 'Gear Shobber', 'Bevel Gear Generator'] },
];

export default function Header({ searchIndex }: { searchIndex: SearchIndex }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  const catLink = (c: string) => `/products?category=${encodeURIComponent(c)}`;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      {/* ---- Top bar (dark) ---- */}
      <div className="hdr-topbar" style={{ background: 'var(--hot)', color: '#fff', fontSize: 13 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={15} style={{ color: '#fff' }} />
            <span>Inspected &amp; verified used machinery — trusted dealer since 1990.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <a href="tel:+919322401398" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Phone size={14} style={{ color: '#fff' }} /> +91 93224 01398
            </a>
            <a href="mailto:ajmeraenterprise@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Mail size={14} style={{ color: '#fff' }} /> ajmeraenterprise@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* ---- Main header (white) ---- */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', padding: '5px 0px' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 24, height: 'var(--header-h)' }}>
          <Link href="/" aria-label="Ajmera Machines" style={{ flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO}
              alt="Ajmera Machines"
              style={{ height: 80, width: 'auto', objectFit: 'contain', display: 'block' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </Link>

          <div className="hdr-search" style={{ flex: 1, maxWidth: 620 }}>
            <SearchBar index={searchIndex} />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="hdr-phone" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Phone size={20} />
              </span>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Need help? Call</div>
                <a href="tel:+919322401398" style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  +91 93224 01398
                </a>
              </div>
            </div>
            <a href={WA} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp hdr-wa">
              <MessageCircle size={17} /> WhatsApp
            </a>
            <button
              aria-label="Menu"
              onClick={() => setMobileOpen((o) => !o)}
              style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 6 }}
              className="menu-btn"
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Category nav bar ---- */}
      <div className="hdr-catnav" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 56, position: 'relative' }}>
          {/* All Categories mega trigger */}
          <div
            onMouseEnter={() => setMegaOpen(true)}
            onMouseLeave={() => setMegaOpen(false)}
            style={{ position: 'relative' }}
          >
            <button
              onClick={() => setMegaOpen((o) => !o)}
              className="btn btn-primary btn-sm"
              style={{ height: 40, borderRadius: 'var(--radius-sm)' }}
            >
              <LayoutGrid size={16} /> All Categories <ChevronDown size={15} />
            </button>

            {megaOpen && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: 10,
                  width: 720, maxWidth: '90vw',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-xl)',
                  padding: 24,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 20,
                }}
              >
                {MEGA.map((col) => (
                  <div key={col.group}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--accent-soft)' }}>
                      {col.group}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {col.items.map((it) => (
                        <Link key={it} href={catLink(it)} onClick={() => setMegaOpen(false)} style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
                          {it}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            {NAV.map((item) => {
              const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  style={{
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5,
                    padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Truck size={16} style={{ color: 'var(--accent)' }} /> Worldwide export
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Clock size={16} style={{ color: 'var(--accent)' }} /> Reply in hours
            </span>
            <Link href="/contact" className="btn btn-hot btn-sm">
              Get Best Price <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ---- Mobile drawer ---- */}
      {mobileOpen && (
        <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', padding: '18px 0 24px' }}>
          <div className="container">
            <div style={{ marginBottom: 16 }}><SearchBar index={searchIndex} /></div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 18 }}>
              {NAV.map((item) => {
                const active = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16,
                      padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                    }}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: '4px 14px 10px' }}>
              Categories
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 20 }}>
              {MEGA.flatMap((c) => c.items).slice(0, 12).map((it) => (
                <Link key={it} href={catLink(it)} onClick={() => setMobileOpen(false)} style={{ fontSize: 13.5, color: 'var(--text-secondary)', padding: '8px 14px' }}>
                  {it}
                </Link>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <a href={WA} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp" style={{ flex: 1 }}>
                <MessageCircle size={17} /> WhatsApp
              </a>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="btn btn-hot" style={{ flex: 1 }}>
                Get Best Price
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Responsive header behaviour */}
      <style>{`
        .menu-btn { display: none; }
        /* Tablet & below: collapse the desktop mega-nav + phone into the hamburger */
        @media (max-width: 1024px) {
          .hdr-catnav { display: none !important; }
          .hdr-phone { display: none !important; }
          .menu-btn { display: inline-flex !important; }
        }
        /* Small tablet: drop the dark utility top bar */
        @media (max-width: 768px) {
          .hdr-topbar { display: none !important; }
        }
        /* Phones: move search + WhatsApp button into the drawer */
        @media (max-width: 560px) {
          .hdr-search { display: none !important; }
          .hdr-wa { display: none !important; }
        }
      `}</style>
    </header>
  );
}
