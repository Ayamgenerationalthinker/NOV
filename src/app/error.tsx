'use client';

import * as React from 'react';
import { Container } from '@/components/ui/container';
import { AlertTriangle, Database, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-lg text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">Application Error</h2>
          <p className="mt-2 text-sm text-slate-400">
            {error?.message || 'An unexpected error occurred while rendering this view.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-left text-xs space-y-3">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <Database className="h-4 w-4 text-blue-400" />
            Database Setup Checklist
          </div>
          <p className="text-slate-400 leading-relaxed">
            If you deployed to Vercel, ensure you have set your <code className="text-blue-300 font-mono">DATABASE_URL</code> environment variable in your Vercel Project Settings to a live PostgreSQL database (such as Neon, Supabase, or AWS RDS).
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = '/')} className="gap-2">
            <Home className="h-4 w-4" />
            Return Home
          </Button>
        </div>
      </div>
    </Container>
  );
}
