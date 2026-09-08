'use client';

import React, { useState, useEffect } from 'react';
import { OrderStatus } from '@prisma/client';
import {
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Eye,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderItemSummary {
  id: string;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    title: string;
    slug: string;
    coverImage: string | null;
  };
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string | null;
  guestEmail: string | null;
  guestName: string | null;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  paymentProvider: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  items: OrderItemSummary[];
  refunds: Array<{
    id: string;
    amount: number;
    reason: string | null;
    createdAt: string;
  }>;
}

export function OrderManagement() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspector & Refund state
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [refundModalOrder, setRefundModalOrder] = useState<OrderRecord | null>(null);
  const [refundReason, setRefundReason] = useState('Customer requested refund');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      if (search.trim()) params.set('search', search.trim());
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders);
        setTotalPages(json.data.pagination.totalPages);
        setTotalCount(json.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleProcessRefund = async () => {
    if (!refundModalOrder) return;
    setRefunding(true);
    setRefundError(null);
    try {
      const res = await fetch(`/api/admin/orders/${refundModalOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to process refund');
      }

      setActionSuccess(`Order ${refundModalOrder.orderNumber} successfully refunded.`);
      setRefundModalOrder(null);
      if (activeOrder?.id === refundModalOrder.id) {
        setActiveOrder(null);
      }
      fetchOrders();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setRefundError(err.message || 'Failed to process refund');
    } finally {
      setRefunding(false);
    }
  };

  const handleResendReceipt = async (orderId: string) => {
    setSendingReceipt(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/resend-receipt`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess('Receipt email resent successfully.');
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        alert(json.error || 'Failed to resend receipt');
      }
    } catch (err) {
      alert('Network error resending receipt');
    } finally {
      setSendingReceipt(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3" />
            PAID
          </span>
        );
      case OrderStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case OrderStatus.REFUNDED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-400 border border-purple-800/60">
            <RotateCcw className="w-3 h-3" />
            REFUNDED
          </span>
        );
      case OrderStatus.CANCELLED:
      case OrderStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/60">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {(['ALL', 'PAID', 'PENDING', 'REFUNDED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, email, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </form>
      </div>

      {/* Orders Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Order Number</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    No orders match your current filter or search criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customerDisplay =
                    order.customer?.name || order.guestName || 'Guest User';
                  const emailDisplay =
                    order.customer?.email || order.guestEmail || 'No email';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {customerDisplay}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {emailDisplay}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4 font-bold text-white">
                        ${Number(order.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveOrder(order)}
                            className="h-7 px-2 text-[11px] text-slate-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>

                          {order.status === OrderStatus.PAID && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRefundError(null);
                                setRefundModalOrder(order);
                              }}
                              className="h-7 px-2 text-[11px] border-purple-900/60 text-purple-400 hover:bg-purple-950/40 hover:text-purple-300"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{orders.length}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 px-2 border-slate-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-slate-300">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2 border-slate-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white font-mono">
                    {activeOrder.orderNumber}
                  </h3>
                  {getStatusBadge(activeOrder.status)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Placed on {new Date(activeOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Customer & Payment Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Customer Information
                </span>
                <p className="font-semibold text-white mt-1">
                  {activeOrder.customer?.name || activeOrder.guestName || 'Guest User'}
                </p>
                <p className="text-slate-400">
                  {activeOrder.customer?.email || activeOrder.guestEmail}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Payment Details
                </span>
                <p className="font-semibold text-white mt-1">
                  Provider: {activeOrder.paymentProvider || 'Direct / Unknown'}
                </p>
                <p className="text-slate-400">Currency: {activeOrder.currency}</p>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Line Items ({activeOrder.items.length})
              </h4>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{item.product.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Item ID: {item.product.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">
                        ${Number(item.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>${Number(activeOrder.subtotal).toFixed(2)}</span>
              </div>
              {Number(activeOrder.discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-${Number(activeOrder.discountTotal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white text-sm border-t border-slate-800 pt-2 mt-2">
                <span>Total Amount</span>
                <span className="text-emerald-400">
                  ${Number(activeOrder.total).toFixed(2)} {activeOrder.currency}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button
                size="sm"
                variant="outline"
                disabled={sendingReceipt}
                onClick={() => handleResendReceipt(activeOrder.id)}
                className="gap-1.5 text-xs border-slate-800"
              >
                {sendingReceipt ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                )}
                Resend Receipt Email
              </Button>

              <div className="flex items-center gap-2">
                {activeOrder.status === OrderStatus.PAID && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRefundError(null);
                      setRefundModalOrder(activeOrder);
                    }}
                    className="border-purple-900/60 text-purple-400 hover:bg-purple-950/40 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Issue Refund
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setActiveOrder(null)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-red-900/50 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                Initiate Order Refund
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-xs text-slate-300 space-y-2">
              <p>
                You are about to refund order{' '}
                <strong className="text-white font-mono">
                  {refundModalOrder.orderNumber}
                </strong>{' '}
                for <strong className="text-emerald-400">${Number(refundModalOrder.total).toFixed(2)}</strong>.
              </p>
              <p className="text-[11px] text-amber-300">
                ⚠️ This will immediately revoke all customer license keys and digital download entitlements issued for this order.
              </p>
            </div>

            {refundError && (
              <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-300">
                {refundError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Refund Reason / Audit Note
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g. Customer duplicate charge or requested cancellation"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                size="sm"
                variant="ghost"
                disabled={refunding}
                onClick={() => setRefundModalOrder(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={refunding}
                onClick={handleProcessRefund}
                className="bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5 shadow-md shadow-red-600/30"
              >
                {refunding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Confirm Full Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
