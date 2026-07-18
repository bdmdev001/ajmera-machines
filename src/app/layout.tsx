import type { Metadata } from 'next';
import { Poppins, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
// import SiteFrame from '@/components/SiteFrame';
import { getSearchIndex } from '@/lib/products';

/* Self-hosted via next/font — no render-blocking Google Fonts @import round-trip,
   automatic font-display: swap, and preload of the actual font files. */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

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
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
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
        {/* <SiteFrame searchIndex={searchIndex}>{children}</SiteFrame> */}
      </body>
    </html>
  );
}
