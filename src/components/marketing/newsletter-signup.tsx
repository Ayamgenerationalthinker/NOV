'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/marketing/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to subscribe');
      }

      setStatus({
        type: 'success',
        message: json.message || 'Subscribed! Check your inbox for your 10% coupon code (WELCOME10).',
      });
      setEmail('');
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 sm:p-10 overflow-hidden shadow-2xl">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-[11px] font-bold text-blue-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>JOIN THE NOV INNER CIRCLE</span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Get Instant 10% Off Your Next Digital Asset
        </h3>

        <p className="text-xs sm:text-sm text-slate-400">
          Subscribe to release alerts, exclusive developer bundles, and creator drops. We dispatch coupon code <code className="text-blue-400 font-mono font-bold bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">WELCOME10</code> immediately to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="pt-2 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
          <div className="relative flex-1">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your developer email..."
              disabled={loading}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="sm:w-auto w-full gap-1.5 text-xs py-2.5 font-bold shadow-lg shadow-blue-600/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Claim 10% Off</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        {status && (
          <div
            className={`text-xs p-3 rounded-xl border flex items-center justify-center gap-2 animate-in fade-in ${
              status.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}
          >
            {status.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            <span>{status.message}</span>
          </div>
        )}

        <p className="text-[10px] text-slate-500">
          Zero spam guarantee. Unsubscribe with one click at any time.
        </p>
      </div>
    </div>
  );
}
