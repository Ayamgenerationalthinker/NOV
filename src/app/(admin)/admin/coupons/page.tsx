import { CouponManagement } from '@/components/admin/coupon-management';
import { Tag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminCouponsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Tag className="w-6 h-6 text-amber-400" />
          Discount Coupons & Promotion Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Create, edit, toggle, and audit percentage and fixed-amount promotional discount codes.
        </p>
      </div>

      <CouponManagement />
    </div>
  );
}
