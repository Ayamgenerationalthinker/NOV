import { Metadata } from 'next';
import { FulfillmentManagement } from '@/components/admin/fulfillment-management';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Order Fulfillment & Shipping — NOV Merchant Console',
};

export default function FulfillmentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Truck className="w-7 h-7 text-emerald-400" />
            Order Fulfillment & Dispatch
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Carrier assignment, parcel dispatching, and live tracking management.
          </p>
        </div>
      </div>

      <FulfillmentManagement />
    </div>
  );
}
