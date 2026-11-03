import Link from 'next/link';
import { BarChart3, Download, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';

const POINTS = [
  { icon: BarChart3, text: 'Sales, orders and visitors in one place' },
  { icon: Download, text: 'Upload guides and share their links' },
  { icon: ShieldCheck, text: 'Payments verified with Paystack' },
];

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Small print under the form. */
  footer?: React.ReactNode;
}

/** Split screen for sign-in and password pages: a navy brand panel beside the form. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-[#f3f6fd] font-body lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-[#001650] p-12 text-[#ffffff] lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_85%_20%,rgba(11,92,255,0.6),transparent_70%),radial-gradient(45%_45%_at_0%_100%,rgba(11,92,255,0.35),transparent_70%)]"
        />
        <Link href="/" aria-label="Tomevari home" className="relative flex min-h-11 w-fit items-center rounded-lg">
          <BrandLogo className="h-10" />
        </Link>
        <div className="relative max-w-md">
          <p className="font-heading text-[40px] font-extrabold leading-[1.08] tracking-[-0.03em]">
            Run your guide shop from one calm place.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-base text-[#ffffff]/85">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffffff]/10 ring-1 ring-[#ffffff]/15">
                  <Icon className="h-5 w-5 text-[#8fb4ff]" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-[#ffffff]/60">Tomevari · practical guides, paid in GH₵</p>
      </aside>

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link href="/" aria-label="Tomevari home" className="mb-8 flex min-h-11 items-center rounded-lg lg:hidden">
          <BrandLogo className="h-10" />
        </Link>
        <div className="w-full max-w-[420px] rounded-3xl border border-[#dde5f6] bg-[#ffffff] p-6 shadow-[0_30px_60px_-30px_rgba(0,22,80,0.35)] sm:p-8">
          <h1 className="font-heading text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-[#001650]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-[#46557d]">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 max-w-[420px] text-center text-sm text-[#46557d]">{footer}</div>}
      </div>
    </div>
  );
}

/** Field styles shared by the auth forms. Literal colours so they read the same in any theme. */
export const authField =
  'min-h-12 w-full rounded-2xl border border-[#c7d1e8] bg-[#ffffff] px-4 text-base text-[#001650] placeholder:text-[#8d9cc2] focus:border-[#0b5cff] focus:outline-none focus:ring-4 focus:ring-[#0b5cff]/15';
export const authLabel = 'mb-1.5 block text-[15px] font-semibold text-[#001650]';
export const authButton =
  'flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0b5cff] px-6 text-[15px] font-bold text-[#ffffff] shadow-[0_12px_28px_-12px_rgba(11,92,255,0.75)] transition-colors hover:bg-[#0848e0] disabled:opacity-60';
