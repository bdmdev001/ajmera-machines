'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import type { SearchIndex } from '@/lib/products';

/**
 * Wraps the public site chrome (Header / Footer / WhatsApp float) and hides it
 * on the admin dashboard, which supplies its own layout (sidebar shell). Server
 * page content is still rendered on the server and passed through as children.
 */
export default function SiteFrame({ searchIndex, children }: { searchIndex: SearchIndex; children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header searchIndex={searchIndex} />
      <main style={{ flex: '1 0 auto' }}>{children}</main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
