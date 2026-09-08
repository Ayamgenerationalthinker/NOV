'use client';

import * as React from 'react';
import { AlertTriangle, Database, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Unhandled root layout error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 antialiased">
        <div className="mx-auto max-w-lg text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Application Error</h2>
            <p className="mt-2 text-sm text-slate-400">
              {error?.message || 'An unexpected error occurred while rendering the application.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-left text-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <Database className="h-4 w-4 text-blue-400" />
              Database Setup Checklist
            </div>
            <p className="text-slate-400 leading-relaxed">
              If this error is occurring on your live Vercel deployment, verify that your <code className="text-blue-300 font-mono">DATABASE_URL</code> environment variable is set in your Vercel Project Settings to a live hosted PostgreSQL database (such as Neon, Supabase, or AWS RDS).
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
