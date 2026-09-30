import { Metadata } from 'next';
import { StoreSettings } from '@/components/admin/store-settings';
import { Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Merchant Store Settings — Tomevari admin',
};

export default function StoreSettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-emerald-400" />
            Merchant Store Settings
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Storefront bio, brand colors, logo, and return & shipping policy configuration.
          </p>
        </div>
      </div>

      <StoreSettings />
    </div>
  );
}
