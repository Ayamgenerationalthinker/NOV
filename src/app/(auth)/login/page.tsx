'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { isSafeRedirect } from '@/lib/safe-redirect';
import { AuthShell, authButton, authField, authLabel } from '@/components/auth/auth-shell';

const fieldClass = authField;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths: never follow ?redirect= to another website after sign-in.
  const requestedRedirect = searchParams.get('redirect') || '';
  const redirectUrl = isSafeRedirect(requestedRedirect) ? requestedRedirect : '/admin';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Could not sign in. Please check your email and password.');
        setIsLoading(false);
        return;
      }

      router.push(redirectUrl);
      router.refresh();
    } catch {
      setError('Network problem. Check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#b3261e]/30 bg-[#fcebea] p-3 text-[15px] text-[#b3261e]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className={authLabel}>Email</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className={fieldClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-[15px] font-semibold text-[#001650]">Password</label>
          <Link href="/forgot-password" className="flex min-h-11 items-center text-sm font-semibold text-[#0848e0] hover:underline">Forgot password?</Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={`${fieldClass} pr-12`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#46557d] hover:text-[#001650]"
          >
            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={authButton}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Sign in
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your guides, orders and payments."
      footer={
        <>
          Buying a guide? You don’t need an account.{' '}
          <Link href="/products" className="font-semibold text-[#0848e0] underline underline-offset-4">Go to the shop</Link>
        </>
      }
    >
      <React.Suspense fallback={<div className="h-64" />}>
        <LoginForm />
      </React.Suspense>
    </AuthShell>
  );
}
