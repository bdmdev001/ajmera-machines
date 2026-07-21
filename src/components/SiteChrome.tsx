'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import type { SearchIndex } from '@/lib/products';

/* The admin panel has its own full-height sidebar shell, so the public site
   header / footer / floating widgets are suppressed on all /admin routes. */
export default function SiteChrome({
  searchIndex,
  children,
}: {
  searchIndex: SearchIndex;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname?.startsWith('/admin/');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header searchIndex={searchIndex} />
      <main style={{ flex: '1 0 auto' }}>{children}</main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
