import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { BrandLogo } from './brand-logo';

/** Slim header for checkout and the payment screens: the way back, and nothing else to tap. */
export function CheckoutHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <header className="bg-ink font-body text-white">
      <div className="mx-auto flex h-[62px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 lg:h-[70px] lg:px-16">
        <div className="flex min-w-0 items-center gap-2 lg:gap-5">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-1 text-[15px] font-medium text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <Link href="/" aria-label="Tomevari home" className="flex min-h-11 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <BrandLogo className="h-8 lg:h-9" />
          </Link>
        </div>
        <p className="flex shrink-0 items-center gap-2 text-sm text-white/85">
          <Lock className="h-4 w-4" aria-hidden /> Secure checkout
        </p>
      </div>
    </header>
  );
}
