import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Shield, Lock, Zap, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 text-slate-400">
      {/* Trust Highlights Strip */}
      <div className="border-b border-slate-900 bg-slate-900/40 py-6">
        <Container>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-950/60 p-2 text-blue-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Instant Access</p>
                <p className="text-xs text-slate-400">Immediate digital delivery</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-950/60 p-2 text-emerald-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Secure Payments</p>
                <p className="text-xs text-slate-400">Encrypted global checkout</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-950/60 p-2 text-indigo-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Direct from Creator</p>
                <p className="text-xs text-slate-400">100% authentic product files</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-950/60 p-2 text-purple-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Lifetime Updates</p>
                <p className="text-xs text-slate-400">Free access to revisions</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span>DigiCommerce</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Direct-to-consumer digital commerce platform delivering premium digital goods with secure international and African payment solutions.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Catalog</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-white transition-colors">
                  Product Categories
                </Link>
              </li>
              <li>
                <Link href="/bundles" className="hover:text-white transition-colors">
                  Bundles & Packs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Customer Care</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/account" className="hover:text-white transition-colors">
                  Customer Library
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Legal & Licensing</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/license" className="hover:text-white transition-colors">
                  Digital Product License
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} DigiCommerce. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Powered by DigiCommerce Core</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
