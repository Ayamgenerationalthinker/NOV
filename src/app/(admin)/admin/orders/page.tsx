import { OrderManagement } from '@/components/admin/order-management';
import { ShoppingCart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ShoppingCart className="w-6 h-6 text-blue-400" />
          Global Order Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review, filter, inspect line items, re-dispatch receipts, and issue instant refunds with license revocation.
        </p>
      </div>

      <OrderManagement />
    </div>
  );
}
