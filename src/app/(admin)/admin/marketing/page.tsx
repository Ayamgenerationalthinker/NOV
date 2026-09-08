import { MarketingManagement } from '@/components/admin/marketing-management';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminMarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-blue-400" />
          Marketing, Flash Sales & Recovery Campaigns
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure real-time countdown promotion banners, re-engage abandoned checkouts, and view newsletter subscribers.
        </p>
      </div>

      <MarketingManagement />
    </div>
  );
}
