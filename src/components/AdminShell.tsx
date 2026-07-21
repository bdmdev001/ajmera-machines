'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, LogOut, Package, ClipboardList,
  ExternalLink, Tag, Users, Contact, Building2, Menu, X,
} from 'lucide-react';

/* The website's light logo variant (the one used on the dark footer), so it
   reads clearly on the dark navy admin sidebar, drawer and mobile top bar. */
const LOGO = 'https://res.cloudinary.com/z5xktswf/image/upload/f_auto,q_auto,w_760/v1784268556/ajmera/homepage/ajmera-logo-footer.png';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Inventory', path: '/admin/inventory', icon: Package },
  { name: 'Categories', path: '/admin/categories', icon: Tag },
  { name: 'Enquiries', path: '/admin/enquiries', icon: ClipboardList },
  { name: 'Customers', path: '/admin/customers', icon: Contact },
  { name: 'Vendors', path: '/admin/vendors', icon: Building2 },
  { name: 'Subscribers', path: '/admin/subscribers', icon: Users },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close the drawer on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The login screen is a standalone auth page — render it without the shell.
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (confirm('Sign out of the admin panel?')) {
      const res = await fetch('/api/admin/login', { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/login');
        router.refresh();
      }
    }
  };

  const brand = (
    <Link href="/admin" className="admin-brand" aria-label="Ajmera Enterprise — Admin Panel" onClick={close}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="admin-brand-logo" src={LOGO} alt="Ajmera Enterprise" width={362} height={90} />
      <span className="admin-brand-tag">Admin Panel</span>
    </Link>
  );

  return (
    <div className={`admin-shell${open ? ' is-open' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar__brand">
          {brand}
          <button
            type="button"
            className="admin-sidebar__close"
            aria-label="Close menu"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.path === '/admin'
              ? pathname === '/admin'
              : pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`admin-navlink${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={close}
              >
                <Icon size={17} /> {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <Link href="/" target="_blank" className="admin-sidebar__link" onClick={close}>
            <ExternalLink size={16} /> View Site
          </Link>
          <button type="button" className="admin-signout" onClick={handleLogout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay (drawer mode only) */}
      <div
        className="admin-overlay"
        role="presentation"
        onClick={close}
      />

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-hamburger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Link href="/admin" className="admin-topbar__brand" aria-label="Ajmera Enterprise — Admin Panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="admin-topbar__logo" src={LOGO} alt="Ajmera Enterprise" width={362} height={90} />
            <span className="admin-topbar__tag">Admin</span>
          </Link>
        </header>

        <div className="admin-main__body">{children}</div>
      </div>
    </div>
  );
}
