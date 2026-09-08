import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: {
    template: '%s | NOV.com',
    default: 'NOV.com — Premium Digital Products Platform',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <CartProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
