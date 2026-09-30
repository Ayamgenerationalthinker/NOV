import { OrderManagement } from '@/components/admin/order-management';

export const dynamic = 'force-dynamic';

export default function AdminOrdersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Orders</h1>
        <p className="mt-1 text-sm text-stone-400">Mark deliveries as shipped, resend receipts and issue refunds.</p>
      </div>
      <OrderManagement />
    </div>
  );
}
