import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SiteChrome } from '@/components/layout/site-chrome';
import { env } from '@/lib/env';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  // Lets relative image/URL metadata resolve to absolute URLs (needed for social previews).
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    template: `%s | ${env.NEXT_PUBLIC_APP_NAME}`,
    default: env.NEXT_PUBLIC_APP_NAME,
  },
  description:
    'Ebooks, courses and videos for building skills and income. Pay in GH₵ with Mobile Money or card, no account needed.',
  applicationName: env.NEXT_PUBLIC_APP_NAME,
  // Favicons come from app/favicon.ico, app/icon.png and app/apple-icon.png (built from the logo).
  openGraph: {
    siteName: env.NEXT_PUBLIC_APP_NAME,
    images: [{ url: '/brand/tomevari-og.jpg', width: 1200, height: 630, alt: env.NEXT_PUBLIC_APP_NAME }],
  },
  twitter: { card: 'summary_large_image', images: ['/brand/tomevari-og.jpg'] },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#021648',
  width: 'device-width',
  initialScale: 1,
};

import { CartProvider } from '@/context/cart-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-stone-950 text-stone-100 antialiased selection:bg-blue-300 selection:text-stone-950">
        <CartProvider>
          <SiteChrome header={<Header />} footer={<Footer />}>
            {children}
          </SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
