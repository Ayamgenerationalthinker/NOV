import { CustomerManagement } from '@/components/admin/customer-management';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Users className="w-6 h-6 text-purple-400" />
          Customer Directory & Relationship Hub
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Search customer accounts, review lifetime value (LTV), inspect granted digital licenses, and audit download logs.
        </p>
      </div>

      <CustomerManagement />
    </div>
  );
}
