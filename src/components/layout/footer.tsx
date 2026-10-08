import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Container } from '@/components/ui/container';
import { env } from '@/lib/env';

const linkClass = 'text-cream/75 transition-colors duration-300 hover:text-cream';
const columnTitle = 'text-xs font-semibold uppercase tracking-[0.2em] text-brass-200';

export function Footer() {
  const name = env.NEXT_PUBLIC_APP_NAME;
  const mailto = `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`;

  return (
    <footer className="relative overflow-hidden bg-forest pt-16 font-display">
      <Container>
        <div className="glass rounded-[2rem] p-7 sm:p-10">
          <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Link href="/" className="text-lg font-semibold tracking-[0.28em] text-cream">
                {name.toUpperCase()}
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/75">
                Ebooks and downloads with practical, step-by-step guidance for building skills and income. Plant the
                idea, grow the skill, and see what it brings.
              </p>
              <p className="mt-5 flex items-center gap-2 text-sm text-cream/85">
                <Lock className="h-4 w-4 shrink-0 text-brass" aria-hidden /> Secure checkout with Mobile Money or card
                (GH₵)
              </p>
            </div>

            <nav aria-label="Shop" className="flex flex-col gap-3 text-sm">
              <p className={columnTitle}>Shop</p>
              <Link href="/#shop" className={linkClass}>All products</Link>
              <Link href="/#how-it-works" className={linkClass}>How it works</Link>
              <Link href="/#why" className={linkClass}>Why {name}</Link>
            </nav>

            <nav aria-label="Contact" className="flex flex-col gap-3 text-sm">
              <p className={columnTitle}>Contact</p>
              <a href={mailto} className={linkClass}>Contact</a>
              <Link href="/#faq" className={linkClass}>FAQ</Link>
              <Link href="/#stories" className={linkClass}>Reader stories</Link>
            </nav>

            <nav aria-label="Legal" className="flex flex-col gap-3 text-sm">
              <p className={columnTitle}>Legal</p>
              <Link href="/#faq" className={linkClass}>Refunds &amp; delivery</Link>
              <a href={`${mailto}?subject=Privacy%20or%20terms%20question`} className={linkClass}>
                Privacy &amp; terms questions
              </a>
            </nav>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-cream/10 pt-6 text-xs text-cream/70">
            <p>© {new Date().getFullYear()} {name}</p>
            <Link href="/login" className="hover:text-cream">Owner login</Link>
          </div>
        </div>
      </Container>

      <p
        aria-hidden
        className="wordmark-fade pointer-events-none -mb-[0.18em] mt-6 select-none whitespace-nowrap text-center text-[17.5vw] font-semibold leading-none tracking-[-0.04em]"
      >
        {name.toUpperCase()}
      </p>
    </footer>
  );
}
