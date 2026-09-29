'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, CheckCircle2, XCircle, AlertCircle, RefreshCw, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ReturnStatus } from '@prisma/client';

interface ReturnItem {
  id: string;
  orderId: string;
  status: ReturnStatus;
  reason: string;
  customerComment?: string | null;
  sellerResponse?: string | null;
  refundAmount?: number | null;
  isRestocked: boolean;
  createdAt: string;
  order: {
    orderNumber: string;
  };
  orderItem: {
    quantity: number;
    unitPrice: number;
    product: {
      title: string;
    };
    variant?: {
      sku: string;
      title: string;
    } | null;
  };
  customer: {
    name?: string | null;
    email: string;
  };
}

export function ReturnsManagement() {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seller/returns');
      const data = await res.json();
      if (res.ok && data.returns) {
        setReturns(data.returns);
      }
    } catch (err) {
      console.error('Failed to load returns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleUpdateStatus = async (
    returnId: string,
    status: ReturnStatus,
    restockInventory: boolean = false
  ) => {
    setProcessingId(returnId);
    try {
      const res = await fetch(`/api/seller/returns/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          restockInventory,
          sellerResponse: `Processed status update to ${status}`,
        }),
      });

      if (res.ok) {
        fetchReturns();
      }
    } catch (err) {
      console.error('Failed to update return', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Customer Returns & Refund Management</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review customer return claims, approve inspect requests, and restore inventory.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchReturns}
          className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/80 text-xs font-mono uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Order # & Customer</th>
                <th className="py-3 px-4">Product / Variant</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    Loading return requests...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No active return requests.
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-800/30">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-white font-medium">{r.order.orderNumber}</div>
                      <div className="text-xs text-zinc-400">{r.customer.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-white">{r.orderItem.product.title}</div>
                      {r.orderItem.variant && (
                        <div className="text-[11px] font-mono text-emerald-400">
                          {r.orderItem.variant.sku}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-300 max-w-xs">
                      <div>{r.reason}</div>
                      {r.customerComment && (
                        <div className="text-zinc-500 italic mt-0.5">{r.customerComment}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.status === 'APPROVED' || r.status === 'REFUNDED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-400">{formatDate(r.createdAt)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {r.status === 'REQUESTED' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={processingId === r.id}
                            onClick={() => handleUpdateStatus(r.id, ReturnStatus.APPROVED, true)}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-medium rounded-lg shadow"
                          >
                            Approve & Restock
                          </button>
                          <button
                            type="button"
                            disabled={processingId === r.id}
                            onClick={() => handleUpdateStatus(r.id, ReturnStatus.REJECTED, false)}
                            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 text-xs font-medium rounded-lg border border-zinc-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status === 'APPROVED' && (
                        <button
                          type="button"
                          disabled={processingId === r.id}
                          onClick={() => handleUpdateStatus(r.id, ReturnStatus.REFUNDED, false)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-medium rounded-lg border border-zinc-700"
                        >
                          Mark Refunded
                        </button>
                      )}
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
