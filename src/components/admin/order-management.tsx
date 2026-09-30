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
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface OrderItemSummary {
  id: string;
  quantity: number;
  productKind: 'DIGITAL' | 'PHYSICAL';
  unitPrice: number;
  totalPrice: number;
  variant: { title: string; option1Value: string | null } | null;
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
  fulfillmentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  taxTotal: number;
  total: number;
  shippingAddress: { fullName?: string; street?: string; city?: string; state?: string; postalCode?: string; phone?: string } | null;
  billingAddress: { fullName?: string; email?: string; phone?: string } | null;
  fulfillments: Array<{ trackingNumber: string | null; trackingCarrier: string | null; dispatchedAt: string | null }>;
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

  // Mark shipped
  const [shipOrder, setShipOrder] = useState<OrderRecord | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [shipping, setShipping] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      if (search.trim()) params.set('search', search.trim());
      if (selectedStatus === 'TO_SHIP') params.set('shipping', 'to_ship');
      else if (selectedStatus === 'SHIPPED') params.set('shipping', 'shipped');
      else if (selectedStatus !== 'ALL') params.set('status', selectedStatus);

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

  const handleMarkShipped = async () => {
    if (!shipOrder) return;
    setShipping(true);
    setShipError(null);
    try {
      const res = await fetch('/api/seller/fulfillments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: shipOrder.id,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingCarrier: trackingCarrier.trim() || undefined,
          status: 'FULFILLED',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not mark as shipped');
      setActionSuccess(`Order ${shipOrder.orderNumber} marked as shipped.`);
      setShipOrder(null);
      setTrackingNumber('');
      setTrackingCarrier('');
      fetchOrders();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setShipError(err.message || 'Could not mark as shipped');
    } finally {
      setShipping(false);
    }
  };

  const needsShipping = (order: OrderRecord) =>
    order.status === OrderStatus.PAID &&
    order.items.some((i) => i.productKind === 'PHYSICAL') &&
    order.fulfillmentStatus !== 'FULFILLED';

  const isShipped = (order: OrderRecord) =>
    order.items.some((i) => i.productKind === 'PHYSICAL') && order.fulfillmentStatus === 'FULFILLED';

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300">
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
        <div className="flex items-center gap-1 overflow-x-auto bg-stone-900/80 p-1 rounded-xl border border-stone-800">
          {(
            [
              ['ALL', 'All'],
              ['PAID', 'Paid'],
              ['PENDING', 'Pending'],
              ['TO_SHIP', 'To ship'],
              ['SHIPPED', 'Shipped'],
              ['REFUNDED', 'Refunded'],
            ] as const
          ).map(([st, label]) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-amber-300 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 md:max-w-sm">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -transtone-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, email, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-900/90 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-300 transition-colors"
          />
        </form>
      </div>

      {/* Orders Data Table */}
      <div className="rounded-xl border border-stone-800 bg-stone-900/50 overflow-hidden">
        {/* Phones: one card per order */}
        <div className="divide-y divide-stone-800/60 md:hidden">
          {loading ? (
            <div className="py-14 text-center text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-14 px-4 text-center text-sm text-stone-500">No orders match this filter.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{order.customer?.name || order.guestName || 'Guest'}</p>
                    <p className="truncate text-xs text-stone-500">{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-white tabular-nums">{formatCurrency(order.total, order.currency)}</p>
                </div>
                <p className="text-sm text-stone-300">
                  {order.items
                    .map((i) => `${i.product.title}${i.variant?.option1Value ? ` (${i.variant.title})` : ''}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`)
                    .join(', ')}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {getStatusBadge(order.status)}
                  {needsShipping(order) && (
                    <span className="rounded-full border border-amber-800/60 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">TO SHIP</span>
                  )}
                  {isShipped(order) && (
                    <span className="rounded-full border border-sky-800/60 bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-300">SHIPPED</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setActiveOrder(order)}>
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>
                  {needsShipping(order) && (
                    <Button
                      size="sm"
                      variant="success"
                      className="flex-1"
                      onClick={() => {
                        setShipError(null);
                        setShipOrder(order);
                      }}
                    >
                      <Truck className="w-3.5 h-3.5" /> Mark shipped
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Larger screens: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-900/90 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-800">
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
            <tbody className="divide-y divide-stone-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-stone-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-300 mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-stone-500">
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
                      className="hover:bg-stone-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-200">
                          {customerDisplay}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {emailDisplay}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-stone-400">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {getStatusBadge(order.status)}
                          {needsShipping(order) && (
                            <span className="rounded-full border border-amber-800/60 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">TO SHIP</span>
                          )}
                          {isShipped(order) && (
                            <span className="rounded-full border border-sky-800/60 bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-300">SHIPPED</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-stone-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveOrder(order)}
                            className="h-7 px-2 text-[11px] text-stone-300 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>

                          {needsShipping(order) && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => {
                                setShipError(null);
                                setShipOrder(order);
                              }}
                              className="h-7 px-2 text-[11px]"
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" />
                              Mark shipped
                            </Button>
                          )}

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
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-800 bg-stone-900/80 text-xs text-stone-400">
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
              className="h-7 px-2 border-stone-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-stone-300">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 px-2 border-stone-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white font-mono">
                    {activeOrder.orderNumber}
                  </h3>
                  {getStatusBadge(activeOrder.status)}
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Placed on {new Date(activeOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Customer & Payment Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80">
                <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                  Customer Information
                </span>
                <p className="font-semibold text-white mt-1">
                  {activeOrder.customer?.name || activeOrder.guestName || 'Guest User'}
                </p>
                <p className="text-stone-400">
                  {activeOrder.customer?.email || activeOrder.guestEmail}
                </p>
                {(activeOrder.billingAddress?.phone || activeOrder.shippingAddress?.phone) && (
                  <a
                    href={`tel:${activeOrder.billingAddress?.phone || activeOrder.shippingAddress?.phone}`}
                    className="text-emerald-400 underline"
                  >
                    {activeOrder.billingAddress?.phone || activeOrder.shippingAddress?.phone}
                  </a>
                )}
              </div>

              <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80">
                <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                  Payment Details
                </span>
                <p className="font-semibold text-white mt-1">
                  Provider: {activeOrder.paymentProvider || 'Direct / Unknown'}
                </p>
                <p className="text-stone-400">Currency: {activeOrder.currency}</p>
              </div>
            </div>

            {/* Delivery */}
            {activeOrder.shippingAddress && (
              <div className="p-3 rounded-lg bg-stone-950/60 border border-stone-800/80 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Deliver to</span>
                <p className="font-semibold text-white">{activeOrder.shippingAddress.fullName}</p>
                <p className="text-stone-300">
                  {[activeOrder.shippingAddress.street, activeOrder.shippingAddress.city, activeOrder.shippingAddress.state, activeOrder.shippingAddress.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {activeOrder.fulfillments[0]?.dispatchedAt && (
                  <p className="text-sky-300">
                    Shipped {new Date(activeOrder.fulfillments[0].dispatchedAt).toLocaleDateString()}
                    {activeOrder.fulfillments[0].trackingNumber &&
                      ` · ${activeOrder.fulfillments[0].trackingCarrier ? `${activeOrder.fulfillments[0].trackingCarrier} ` : ''}${activeOrder.fulfillments[0].trackingNumber}`}
                  </p>
                )}
              </div>
            )}

            {/* Itemized Line Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Line Items ({activeOrder.items.length})
              </h4>
              <div className="divide-y divide-stone-800 border border-stone-800 rounded-xl overflow-hidden bg-stone-950/40">
                {activeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{item.product.title}</p>
                      <p className="text-[11px] text-stone-500">
                        {item.variant?.option1Value ? `${item.variant.title} · ` : ''}Qty {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">
                        {formatCurrency(item.totalPrice, activeOrder.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-1 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal</span>
                <span>{formatCurrency(activeOrder.subtotal, activeOrder.currency)}</span>
              </div>
              {Number(activeOrder.discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(activeOrder.discountTotal, activeOrder.currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white text-sm border-t border-stone-800 pt-2 mt-2">
                <span>Total Amount</span>
                <span className="text-emerald-400">
                  {formatCurrency(activeOrder.total, activeOrder.currency)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <Button
                size="sm"
                variant="outline"
                disabled={sendingReceipt}
                onClick={() => handleResendReceipt(activeOrder.id)}
                className="gap-1.5 text-xs border-stone-800"
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
          <div className="relative w-full max-w-md rounded-2xl border border-red-900/50 bg-stone-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                Initiate Order Refund
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-xs text-stone-300 space-y-2">
              <p>
                You are about to refund order{' '}
                <strong className="text-white font-mono">
                  {refundModalOrder.orderNumber}
                </strong>{' '}
                for <strong className="text-emerald-400">{formatCurrency(refundModalOrder.total, refundModalOrder.currency)}</strong>.
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
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Refund Reason / Audit Note
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-300"
                placeholder="e.g. Customer duplicate charge or requested cancellation"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
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

      {/* Mark Shipped Modal */}
      {shipOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Mark {shipOrder.orderNumber} as shipped</h3>
              <p className="text-xs text-stone-400 mt-1">
                {shipOrder.shippingAddress
                  ? [shipOrder.shippingAddress.fullName, shipOrder.shippingAddress.street, shipOrder.shippingAddress.city].filter(Boolean).join(', ')
                  : 'No delivery address on this order.'}
              </p>
            </div>
            <label className="block text-xs text-stone-300">
              Courier <span className="text-stone-500">(optional)</span>
              <input
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
                placeholder="e.g. Ghana Post, Yango, own rider"
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-stone-300">
              Tracking number <span className="text-stone-500">(optional)</span>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 text-sm text-white"
              />
            </label>
            {shipError && <p className="text-xs text-red-400">{shipError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShipOrder(null)} disabled={shipping}>
                Cancel
              </Button>
              <Button variant="success" className="flex-1" onClick={handleMarkShipped} isLoading={shipping}>
                Mark shipped
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
