'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Loader2,
  Percent,
  DollarSign,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscountType } from '@prisma/client';

interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  perCustomerLimit: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    redemptions: number;
  };
}

export function CouponManagement() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>(DiscountType.PERCENTAGE);
  const [discountValue, setDiscountValue] = useState('20');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [perCustomerLimit, setPerCustomerLimit] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `/api/admin/coupons?search=${encodeURIComponent(search.trim())}`
        : '/api/admin/coupons';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCoupons(json.data);
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCoupons();
  };

  const handleToggleStatus = async (coupon: CouponItem) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
        );
        setActionMessage(`Coupon ${coupon.code} ${!coupon.isActive ? 'activated' : 'deactivated'}.`);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      alert('Failed to toggle coupon status');
    }
  };

  const handleDeleteCoupon = async (coupon: CouponItem) => {
    if (!confirm(`Are you sure you want to remove coupon ${coupon.code}?`)) return;

    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage(`Coupon ${coupon.code} removed.`);
        fetchCoupons();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(json.error || 'Failed to delete coupon');
      }
    } catch (err) {
      alert('Network error deleting coupon');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          description: description || undefined,
          discountType,
          discountValue,
          minOrderAmount: minOrderAmount || undefined,
          maxUses: maxUses || undefined,
          perCustomerLimit,
          expiresAt: expiresAt || undefined,
          isActive,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create coupon');
      }

      setActionMessage(`Coupon ${json.data.code} created successfully.`);
      setShowCreateModal(false);
      // Reset form
      setCode('');
      setDescription('');
      setDiscountValue('20');
      setMinOrderAmount('');
      setMaxUses('');
      setExpiresAt('');
      fetchCoupons();
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Action Notification */}
      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Bar: Search and Create Button */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupons by code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </form>

        <Button
          onClick={() => {
            setFormError(null);
            setShowCreateModal(true);
          }}
          size="sm"
          className="gap-1.5 shadow-md shadow-blue-600/30 text-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create New Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Coupon Code</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Redemptions</th>
                <th className="py-3.5 px-4">Min Spend</th>
                <th className="py-3.5 px-4">Expiration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    No coupons created yet. Click "Create New Coupon" to author your first promotion.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                  const isMaxedOut = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700 tracking-wider">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopy(coupon.code)}
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">
                            {coupon.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        {coupon.discountType === DiscountType.PERCENTAGE
                          ? `${Number(coupon.discountValue)}% OFF`
                          : `$${Number(coupon.discountValue).toFixed(2)} OFF`}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{coupon.usedCount}</span>
                        <span className="text-slate-500">
                          {' '}/ {coupon.maxUses !== null ? coupon.maxUses : '∞'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {coupon.minOrderAmount
                          ? `$${Number(coupon.minOrderAmount).toFixed(2)}`
                          : 'None'}
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        {coupon.expiresAt ? (
                          <span className={isExpired ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                            {new Date(coupon.expiresAt).toLocaleDateString()}
                            {isExpired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-slate-500">Never</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isExpired || isMaxedOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/60">
                            {isExpired ? 'EXPIRED' : 'EXHAUSTED'}
                          </span>
                        ) : coupon.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                            DISABLED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(coupon)}
                            className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors ${
                              coupon.isActive
                                ? 'bg-amber-950/50 text-amber-300 hover:bg-amber-900/60 border border-amber-800/50'
                                : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50'
                            }`}
                          >
                            {coupon.isActive ? 'Disable' : 'Enable'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(coupon)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete or deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" />
                  Create Promotion Coupon
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Author a new discount code for campaigns or customer retention
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FLASH25"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={DiscountType.PERCENTAGE}>Percentage (%)</option>
                    <option value={DiscountType.FIXED_AMOUNT}>Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Discount Value * {discountType === DiscountType.PERCENTAGE ? '(1 - 100%)' : '($ USD)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={discountType === DiscountType.PERCENTAGE ? '100' : undefined}
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Minimum Order ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0.00 (optional)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Internal / Customer)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 25% launch event promotion"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Total Uses</label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCoupon"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                />
                <label htmlFor="isActiveCoupon" className="text-slate-300 cursor-pointer">
                  Activate coupon immediately upon creation
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-xs gap-1.5 shadow-md shadow-blue-600/30"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Create Coupon
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
