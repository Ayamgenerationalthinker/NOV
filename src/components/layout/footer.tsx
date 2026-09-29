import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { ShieldCheck, Truck, Zap, RotateCcw, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800 bg-[#09090b] text-zinc-400">
      {/* Editorial Trust Bar */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/60 py-8">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-zinc-900 p-2.5 text-stone-200 border border-zinc-800">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-100 uppercase tracking-wider">Direct Dispatch</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">Small-batch physical fulfillment from the owner atelier.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-zinc-900 p-2.5 text-stone-200 border border-zinc-800">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-100 uppercase tracking-wider">Instant Digital Deliverables</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">Cryptographic signed downloads available immediately upon payment.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-zinc-900 p-2.5 text-stone-200 border border-zinc-800">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-100 uppercase tracking-wider">Verified Authenticity</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">No third-party sellers or unauthorized replicas.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-zinc-900 p-2.5 text-stone-200 border border-zinc-800">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-100 uppercase tracking-wider">14-Day Guarantee</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">Straightforward return workflow on all physical purchases.</p>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 text-stone-100 group">
              <span className="font-serif text-xl tracking-[0.25em] font-semibold uppercase group-hover:text-stone-300 transition-colors">
                N O V
              </span>
              <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase border-l border-zinc-700 pl-2">
                Atelier
              </span>
            </Link>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
              An independent single-owner e-commerce house crafting premium physical hardware, bespoke mechanical timepieces, and precision digital software tools.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Bank, Card & Mobile Money (GHS / USD)</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-200">Catalog</h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/products" className="hover:text-stone-100 transition-colors">
                  All Collections
                </Link>
              </li>
              <li>
                <Link href="/products?kind=PHYSICAL" className="hover:text-stone-100 transition-colors">
                  Physical Goods
                </Link>
              </li>
              <li>
                <Link href="/products?kind=DIGITAL" className="hover:text-stone-100 transition-colors">
                  Digital Deliverables
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-stone-100 transition-colors">
                  Curated Disciplines
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-200">Client Services</h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/account" className="hover:text-stone-100 transition-colors">
                  My Orders & Downloads
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-stone-100 transition-colors">
                  Shipping & Delivery FAQs
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-stone-100 transition-colors">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-stone-100 transition-colors">
                  Direct Studio Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-200">Store Policies</h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li>
                <Link href="/terms" className="hover:text-stone-100 transition-colors">
                  Terms of Sale
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-stone-100 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-stone-100 transition-colors">
                  Refund Framework
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-zinc-400 hover:text-stone-300 transition-colors font-mono">
                  Owner Portal →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-zinc-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-4">
          <p>© {new Date().getFullYear()} NOV Atelier. Single-Owner Online Store. All rights reserved.</p>
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
            <span>Paystack & Flutterwave Secured</span>
            <span>•</span>
            <span>Global & Ghana Fulfillment</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
