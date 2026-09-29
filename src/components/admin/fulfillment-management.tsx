'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Package, Search, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface FulfillmentRecord {
  id: string;
  orderId: string;
  status: string;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  trackingUrl?: string | null;
  dispatchedAt?: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    shippingAddress?: any;
  };
  items: any[];
}

export function FulfillmentManagement() {
  const [fulfillments, setFulfillments] = useState<FulfillmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [carrier, setCarrier] = useState('Ghana Post EMS');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFulfillments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seller/fulfillments');
      const data = await res.json();
      if (res.ok && data.fulfillments) {
        setFulfillments(data.fulfillments);
      }
    } catch (err) {
      console.error('Failed to fetch fulfillments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillments();
  }, []);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/seller/fulfillments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder,
          trackingCarrier: carrier,
          trackingNumber: trackingNumber || undefined,
          trackingUrl: trackingUrl || undefined,
          notes: notes || undefined,
          status: 'FULFILLED',
        }),
      });

      if (res.ok) {
        setSelectedOrder('');
        setTrackingNumber('');
        setTrackingUrl('');
        setNotes('');
        fetchFulfillments();
      }
    } catch (err) {
      console.error('Failed to dispatch fulfillment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dispatch Parcel Form */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-3 text-emerald-400">
          <Truck className="w-5 h-5" />
          <h2 className="text-base font-semibold text-white">Dispatch & Register Tracking</h2>
        </div>
        <p className="text-xs text-zinc-400">
          Assign carrier and tracking references to update order fulfillment status and notify customers.
        </p>

        <form onSubmit={handleDispatch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Order ID / Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. order-id-cuid"
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Shipping Carrier
            </label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
            >
              <option value="Ghana Post EMS">Ghana Post EMS</option>
              <option value="DHL Express">DHL Express</option>
              <option value="FedEx">FedEx International</option>
              <option value="Standard Courier">Local Motorcycle Dispatch</option>
              <option value="UPS">UPS Logistics</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Tracking Number
            </label>
            <input
              type="text"
              placeholder="e.g. GH-88239-EXP"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedOrder}
              className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'Dispatching...' : 'Mark Dispatched'}
            </button>
          </div>
        </form>
      </div>

      {/* Fulfillment Records */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Dispatched Shipments & History</h3>
          <span className="text-xs font-mono text-zinc-400">{fulfillments.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/80 text-xs font-mono uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Carrier</th>
                <th className="py-3 px-4">Tracking Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dispatched Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    Loading fulfillment records...
                  </td>
                </tr>
              ) : fulfillments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No physical order fulfillments recorded yet.
                  </td>
                </tr>
              ) : (
                fulfillments.map((f) => (
                  <tr key={f.id} className="hover:bg-zinc-800/30">
                    <td className="py-3.5 px-4 font-mono font-medium text-white">
                      {f.order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-300">{f.trackingCarrier || 'Standard Delivery'}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-emerald-400">
                      {f.trackingNumber || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-400">
                      {f.dispatchedAt ? formatDate(f.dispatchedAt) : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
