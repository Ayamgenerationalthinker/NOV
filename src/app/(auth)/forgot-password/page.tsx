'use client';

import * as React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to dispatch reset email.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message || 'Password reset link sent to your email.');
      setIsLoading(false);
    } catch {
      setError('An unexpected network error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-16 md:py-24">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-4">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-2 text-xs text-slate-400">Enter your email and we will send a secure reset link</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base">Password Recovery</CardTitle>
            <CardDescription className="text-xs">We will email you instructions to choose a new password.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/40 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Button type="submit" className="w-full gap-2 mt-2" size="md" isLoading={isLoading}>
                <Mail className="h-4 w-4" />
                Send Reset Link
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col border-t border-slate-800/80 pt-4 text-center">
              <Link href="/login" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to sign in
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Container>
  );
}
