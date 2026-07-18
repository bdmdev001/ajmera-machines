'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, LogOut, Package, ClipboardList, ExternalLink, Tag, Users, Contact, Building2 } from 'lucide-react';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    if (confirm('Sign out of the admin panel?')) {
      const res = await fetch('/api/admin/login', { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/login');
        router.refresh();
      }
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'Categories', path: '/admin/categories', icon: Tag },
    { name: 'Enquiries', path: '/admin/enquiries', icon: ClipboardList },
    { name: 'Customers', path: '/admin/customers', icon: Contact },
    { name: 'Vendors', path: '/admin/vendors', icon: Building2 },
    { name: 'Subscribers', path: '/admin/subscribers', icon: Users },
  ];

  return (
    <div style={{ background: 'var(--dark)', color: '#fff', marginBottom: 32, boxShadow: 'var(--shadow-md)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <ShieldCheck size={20} />
          </span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Ajmera Admin</div>
            <div style={{ fontSize: 11, color: 'rgba(238,241,244,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Control Center</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {navItems.map((item) => {
            const active = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5,
                  padding: '9px 16px', borderRadius: 'var(--radius-sm)',
                  color: active ? '#fff' : 'rgba(238,241,244,0.7)',
                  background: active ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                  transition: 'var(--transition-fast)',
                }}
              >
                <Icon size={15} /> {item.name}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/"
            target="_blank"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(238,241,244,0.7)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
          >
            <ExternalLink size={15} /> View site
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(236,68,51,0.14)', border: '1px solid rgba(236,68,51,0.3)',
              color: '#ff8a7d', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              padding: '8px 14px', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-display)', transition: 'var(--transition-fast)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hot)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(236,68,51,0.14)'; e.currentTarget.style.color = '#ff8a7d'; }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
