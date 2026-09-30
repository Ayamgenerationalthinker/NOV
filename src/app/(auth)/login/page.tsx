'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { isSafeRedirect } from '@/lib/safe-redirect';

const fieldClass =
  'w-full rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-3 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-300/60';

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
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-300">Email</label>
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
          <label htmlFor="password" className="text-sm font-medium text-stone-300">Password</label>
          <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-white">Forgot password?</Link>
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
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-stone-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 font-semibold text-stone-950 hover:bg-amber-200 disabled:opacity-60"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <Link href="/" className="font-serif text-xl font-semibold tracking-[0.3em] text-stone-100">TOMEVARI</Link>
          <h1 className="text-2xl font-semibold text-white">Owner sign in</h1>
          <p className="text-sm text-stone-400">Manage your products and orders.</p>
        </div>
        <React.Suspense fallback={<div className="h-64" />}>
          <LoginForm />
        </React.Suspense>
        <p className="text-center text-xs text-stone-500">
          Buying something? You don’t need an account. <Link href="/" className="text-stone-300 underline">Go to the shop</Link>
        </p>
      </div>
    </div>
  );
}
