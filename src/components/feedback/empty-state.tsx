import * as React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = 'No items found',
  message = 'There are no items to display at this moment.',
  actionText,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-4">
        {icon || <PackageOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-xs text-slate-400">{message}</p>
      {actionText && actionHref && (
        <Link href={actionHref} className="mt-6">
          <Button variant="secondary" size="sm">
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  );
}
