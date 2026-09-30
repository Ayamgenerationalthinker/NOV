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
  description: 'Ebooks, digital downloads and handpicked goods. Pay with Mobile Money or card, no account needed.',
  robots: {
    index: true,
    follow: true,
  },
};

import { CartProvider } from '@/context/cart-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-stone-950 text-stone-100 antialiased selection:bg-amber-300 selection:text-stone-950">
        <CartProvider>
          <SiteChrome header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
