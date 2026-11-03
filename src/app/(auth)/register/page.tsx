import Link from 'next/link';
import { Download, Mail, ShoppingBag } from 'lucide-react';
import { AuthShell, authButton } from '@/components/auth/auth-shell';

const STEPS = [
  { icon: ShoppingBag, title: 'Buy as a guest', text: 'Choose a guide and pay with Mobile Money or card.' },
  { icon: Download, title: 'Download straight away', text: 'Your file appears once payment is confirmed.' },
  { icon: Mail, title: 'Keep the link', text: 'We email your receipt and download link too.' },
];

/** Customer sign-up is switched off on the server: buyers check out as guests. */
export default function RegisterPage() {
  return (
    <AuthShell
      title="No account needed"
      subtitle="Tomevari doesn’t use customer accounts. Everything you buy is delivered to your email."
      footer={
        <>
          Run this shop?{' '}
          <Link href="/login" className="font-semibold text-[#0848e0] underline underline-offset-4">Sign in</Link>
        </>
      }
    >
      <ul className="space-y-3">
        {STEPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 rounded-2xl border border-[#dde5f6] bg-[#f5f8ff] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7efff] text-[#0b5cff]">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-[#001650]">{title}</span>
              <span className="block text-sm leading-normal text-[#46557d]">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link href="/products" className={`${authButton} mt-6`}>
        Browse the guides
      </Link>
    </AuthShell>
  );
}
