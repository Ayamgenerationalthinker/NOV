'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  ShoppingBag,
  Key,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerSummary } from '@/services/admin/analytics.service';
import { OrderStatus } from '@prisma/client';

export function CustomerManagement() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Drilldown Inspector State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'licenses' | 'downloads'>('orders');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '12');
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data.customers);
        setTotalPages(json.data.pagination.totalPages);
        setTotalCount(json.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleViewCustomer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const json = await res.json();
      if (json.success) {
        setCustomerDetails(json.data);
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PAID:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            PAID
          </span>
        );
      case OrderStatus.PENDING:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60">
            PENDING
          </span>
        );
      case OrderStatus.REFUNDED:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-400 border border-purple-800/60">
            REFUNDED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </form>

        <div className="text-xs text-slate-400">
          Total Customers: <strong className="text-white">{totalCount}</strong>
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Orders</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Active Licenses</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    No customer accounts found matching your query.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 text-xs shrink-0">
                          {c.name ? c.name.charAt(0).toUpperCase() : c.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {c.name || 'Anonymous User'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {c.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {c.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {c.totalOrders}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      ${c.lifetimeSpend.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {c.activeEntitlements}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewCustomer(c.id)}
                        className="h-7 px-2 text-[11px] text-blue-400 hover:text-blue-300"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{customers.length}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> customers
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

      {/* Customer Profile & Drilldown Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Customer Profile & Purchase Records
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete account overview, entitlements, and download audit trail
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetails(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {detailsLoading || !customerDetails ? (
              <div className="py-16 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                Loading customer profile...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Information Card */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Lifetime Spend</span>
                    <p className="text-base font-extrabold text-emerald-400 mt-1">
                      ${customerDetails.lifetimeSpend.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Paid Orders</span>
                    <p className="text-base font-extrabold text-white mt-1">
                      {customerDetails.paidOrdersCount} / {customerDetails.totalOrders}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Active Licenses</span>
                    <p className="text-base font-extrabold text-blue-400 mt-1">
                      {customerDetails.entitlements.length}
                    </p>
                  </div>
                </div>

                {/* Profile Meta */}
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs space-y-1">
                  <p className="text-slate-300">
                    <strong className="text-white">Email:</strong> {customerDetails.email}
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-white">Name:</strong> {customerDetails.name || 'Not provided'}
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-white">Customer ID:</strong>{' '}
                    <span className="font-mono text-[11px] text-slate-400">{customerDetails.id}</span>
                  </p>
                  <p className="text-slate-300">
                    <strong className="text-white">Member Since:</strong>{' '}
                    {new Date(customerDetails.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Sub-tabs */}
                <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`pb-2 transition-colors ${
                      activeTab === 'orders'
                        ? 'text-blue-400 border-b-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Order History ({customerDetails.orders.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('licenses')}
                    className={`pb-2 transition-colors ${
                      activeTab === 'licenses'
                        ? 'text-blue-400 border-b-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Granted Entitlements ({customerDetails.entitlements.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('downloads')}
                    className={`pb-2 transition-colors ${
                      activeTab === 'downloads'
                        ? 'text-blue-400 border-b-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Download Activity ({customerDetails.downloads.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-2">
                  {activeTab === 'orders' && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {customerDetails.orders.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No orders found.</p>
                      ) : (
                        customerDetails.orders.map((o: any) => (
                          <div
                            key={o.id}
                            className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white">{o.orderNumber}</span>
                                {getStatusBadge(o.status)}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(o.createdAt).toLocaleDateString()} • {o.items.length} items
                              </p>
                            </div>
                            <div className="font-bold text-emerald-400">
                              ${Number(o.total).toFixed(2)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'licenses' && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {customerDetails.entitlements.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No active licenses.</p>
                      ) : (
                        customerDetails.entitlements.map((ent: any) => (
                          <div
                            key={ent.id}
                            className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-white">{ent.product.title}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Granted: {new Date(ent.grantedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ent.status === 'ACTIVE'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-red-950/60 text-red-400 border border-red-800/60'
                              }`}
                            >
                              {ent.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'downloads' && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {customerDetails.downloads.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No file download records.</p>
                      ) : (
                        customerDetails.downloads.map((d: any) => (
                          <div
                            key={d.id}
                            className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-white">
                                {d.productFile?.fileName || 'Digital File'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(d.downloadedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded">
                              {d.ipAddress ? `${d.ipAddress.split('.').slice(0, 2).join('.')}.***.***` : 'Masked IP'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setCustomerDetails(null);
                    }}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
