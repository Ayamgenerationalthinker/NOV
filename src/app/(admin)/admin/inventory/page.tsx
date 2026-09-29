import { Metadata } from 'next';
import { InventoryTable } from '@/components/admin/inventory-table';
import { Boxes } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Inventory & Stock Ledger — NOV Merchant Console',
};

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Boxes className="w-7 h-7 text-emerald-400" />
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time SKU-level stock quantities, atomic adjustment ledger, and low-stock alerts.
          </p>
        </div>
      </div>

      <InventoryTable />
    </div>
  );
}
