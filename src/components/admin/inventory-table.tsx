'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  Minus,
  RefreshCw,
  Search,
  CheckCircle2,
  Boxes,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  price: number;
  inventoryQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  isAvailable: boolean;
  product: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    productKind: string;
  };
}

export function InventoryTable() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seller/inventory');
      const data = await res.json();
      if (res.ok && data.inventory) {
        setItems(data.inventory);
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || adjustmentQty === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/seller/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: adjustingItem.id,
          quantityChange: adjustmentQty,
          note: adjustmentNote || 'Manual inventory adjustment from dashboard',
        }),
      });

      if (res.ok) {
        setAdjustingItem(null);
        setAdjustmentQty(0);
        setAdjustmentNote('');
        fetchInventory();
      }
    } catch (err) {
      console.error('Failed to adjust stock', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.product.title.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase());

    const matchesLowStock = filterLowStock ? item.inventoryQuantity <= 5 : true;
    return matchesSearch && matchesLowStock;
  });

  const totalSKUs = items.length;
  const totalStockUnits = items.reduce((acc, i) => acc + i.inventoryQuantity, 0);
  const lowStockCount = items.filter((i) => i.inventoryQuantity <= 5).length;

  return (
    <div className="space-y-6">
      {/* Top Inventory Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase">Total SKUs</p>
            <p className="text-2xl font-bold text-white mt-1">{totalSKUs}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase">Units in Stock</p>
            <p className="text-2xl font-bold text-white mt-1">{totalStockUnits}</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-400 uppercase">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by SKU or Product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              filterLowStock
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {filterLowStock ? 'Showing Low Stock Only' : 'Filter Low Stock (≤ 5)'}
          </button>

          <button
            type="button"
            onClick={fetchInventory}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-300 transition-all"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/80 text-xs font-mono uppercase text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Variant</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4 text-center">In Stock</th>
                <th className="py-3 px-4 text-center">Reserved</th>
                <th className="py-3 px-4 text-center">Sold</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Loading inventory ledger...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No matching inventory SKUs found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{item.product.title}</div>
                      <div className="text-xs font-mono text-emerald-400 mt-0.5">{item.sku}</div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 text-xs">{item.title}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-200">{formatCurrency(item.price)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                          item.inventoryQuantity <= 5
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {item.inventoryQuantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-400 text-xs">
                      {item.reservedQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-zinc-400 text-xs">
                      {item.soldQuantity}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingItem(item);
                          setAdjustmentQty(0);
                        }}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium border border-zinc-700 transition-all"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white">Adjust Stock Quantity</h3>
              <p className="text-xs text-zinc-400 mt-1">
                {adjustingItem.product.title} • <span className="font-mono text-emerald-400">{adjustingItem.sku}</span>
              </p>
            </div>

            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Current Stock</p>
                <p className="text-xl font-bold font-mono text-white">{adjustingItem.inventoryQuantity}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Resulting Stock</p>
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {Math.max(0, adjustingItem.inventoryQuantity + adjustmentQty)}
                </p>
              </div>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                  Quantity Change (+ to add, - to subtract)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty((q) => q - 1)}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={adjustmentQty}
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-center font-mono text-white text-lg font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustmentQty((q) => q + 1)}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                  Adjustment Reason / Audit Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Restock shipment #401, Inventory count correction"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || adjustmentQty === 0}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-semibold shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
