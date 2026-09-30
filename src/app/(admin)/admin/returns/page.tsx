import { Metadata } from 'next';
import { ReturnsManagement } from '@/components/admin/returns-management';
import { RotateCcw } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Returns & Refunds — Tomevari admin',
};

export default function ReturnsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <RotateCcw className="w-7 h-7 text-emerald-400" />
            Customer Returns & Refunds
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Claim evaluations, inspection status, automatic stock restoration, and dispute resolution.
          </p>
        </div>
      </div>

      <ReturnsManagement />
    </div>
  );
}
