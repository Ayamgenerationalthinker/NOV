import * as React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  resetButtonText?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing your request. Please try again.',
  onRetry,
  resetButtonText = 'Try Again',
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-red-900/30 bg-red-950/10 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-950/60 text-red-400 mb-4 border border-red-800/40">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-xs text-slate-400">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm" className="mt-6 gap-2">
          <RefreshCcw className="h-3.5 w-3.5" />
          {resetButtonText}
        </Button>
      )}
    </div>
  );
}
