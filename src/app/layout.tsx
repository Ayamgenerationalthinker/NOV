import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SiteChrome } from '@/components/layout/site-chrome';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  // Lets relative image/URL metadata resolve to absolute URLs (needed for social previews).
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    template: `%s | ${env.NEXT_PUBLIC_APP_NAME}`,
    default: env.NEXT_PUBLIC_APP_NAME,
  },
  description:
    'NOV.com: Secure, direct-to-consumer digital commerce platform for premium digital goods, ebooks, courses, tools, and templates.',
  keywords: ['NOV', 'NOV.com', 'digital products', 'ebooks', 'developer templates', 'courses', 'software downloads'],
  authors: [{ name: 'NOV.com' }],
  robots: {
    index: true,
    follow: true,
  },
};

import { CartProvider } from '@/context/cart-context';
import { AnnouncementBanner } from '@/components/marketing/announcement-banner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <CartProvider>
          <SiteChrome banner={<AnnouncementBanner />} header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
