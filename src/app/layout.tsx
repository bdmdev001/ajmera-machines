import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import { getSearchIndex } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Ajmera Enterprise - Used Industrial Machinery Dealer',
  description: 'Buy and sell high quality secondhand engineering workshop, tool room, sheet metal, and CNC machinery. Trusted dealer in India.',
  keywords: 'used machinery, secondhand machines, lathe machines, milling machines, grinder, sheet metal machines, Navi Mumbai, India',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const searchIndex = getSearchIndex();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Header searchIndex={searchIndex} />
        <main style={{ flex: '1 0 auto' }}>{children}</main>
        <Footer />
        <WhatsAppFloat />
      </body>
    </html>
  );
}
