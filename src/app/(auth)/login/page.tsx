'use client';

import * as React from 'react';
import { isSafeRedirect } from '@/lib/safe-redirect';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, ArrowRight, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths: never follow ?redirect= to another website after sign-in.
  const requestedRedirect = searchParams.get('redirect') || '';
  const redirectUrl = isSafeRedirect(requestedRedirect) ? requestedRedirect : '/admin';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed. Please verify admin credentials.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Administrator authenticated. Entering Studio Console...');
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 500);
    } catch {
      setError('An unexpected network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base text-stone-100 font-serif">Admin Credentials</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Sign in with your authorized store administrator account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-800/40 bg-red-950/40 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-800/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <Input
            label="Admin Email"
            type="email"
            placeholder="owner@nov.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">Admin Password</label>
              <Link href="/forgot-password" className="text-xs text-stone-400 hover:text-white">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2 mt-2 bg-stone-200 text-zinc-950 hover:bg-white text-xs font-semibold py-2.5"
            size="md"
            isLoading={isLoading}
          >
            Access Studio Console
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col border-t border-zinc-900 pt-4 text-center">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Customer registration is disabled. Customers complete orders directly via guest checkout.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Container className="py-20 md:py-28">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-stone-200 border border-zinc-800 mb-4 shadow-xl">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-white tracking-tight">
            Administrator Sign In
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Exclusive single-owner console for catalog, inventory, and order fulfillment.
          </p>
        </div>

        <React.Suspense fallback={<div className="h-64 rounded-2xl bg-zinc-900/50 animate-pulse border border-zinc-800" />}>
          <LoginForm />
        </React.Suspense>
      </div>
    </Container>
  );
}
