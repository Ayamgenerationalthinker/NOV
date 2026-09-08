import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: {
    template: '%s | DigiCommerce',
    default: 'DigiCommerce — Premium Digital Products Platform',
  },
  description:
    'Secure, direct-to-consumer digital commerce platform for premium digital goods, ebooks, courses, tools, and templates.',
  keywords: ['digital products', 'ebooks', 'developer templates', 'courses', 'software downloads'],
  authors: [{ name: 'DigiCommerce' }],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
