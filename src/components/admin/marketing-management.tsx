'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashSaleCampaign } from '@/services/marketing/marketing.service';

export function MarketingManagement() {
  const [activeTab, setActiveTab] = useState<'flashSale' | 'abandoned' | 'newsletter'>('flashSale');

  // Flash Sale State
  const [campaign, setCampaign] = useState<FlashSaleCampaign>({
    id: 'default',
    headline: 'Launch Week Flash Event: Get 25% Off All Digital Goods & Bundles',
    badge: 'FLASH SALE',
    couponCode: 'LAUNCH25',
    discountText: '25% OFF',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  });
  const [savingCampaign, setSavingCampaign] = useState(false);

  // Abandoned Checkouts State
  const [abandoned, setAbandoned] = useState<any[]>([]);
  const [loadingAbandoned, setLoadingAbandoned] = useState(false);
  const [sendingRecoveryId, setSendingRecoveryId] = useState<string | null>(null);

  // Newsletter State
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Feedback Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Load flash sale
    fetch('/api/marketing/flash-sale')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setCampaign(json.data);
      })
      .catch(() => {});
  }, []);

  const loadAbandoned = async () => {
    setLoadingAbandoned(true);
    try {
      const res = await fetch('/api/admin/marketing/abandoned?hoursAgo=1');
      const json = await res.json();
      if (json.success) setAbandoned(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAbandoned(false);
    }
  };

  const loadSubscribers = async () => {
    setLoadingSubscribers(true);
    try {
      const res = await fetch('/api/admin/marketing/subscribers');
      const json = await res.json();
      if (json.success) {
        setSubscribers(json.data.subscribers);
        setTotalSubscribers(json.data.totalCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'abandoned') loadAbandoned();
    if (activeTab === 'newsletter') loadSubscribers();
  }, [activeTab]);

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCampaign(true);
    setNotification(null);
    try {
      const res = await fetch('/api/marketing/flash-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaign),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotification({ type: 'success', message: 'Flash sale banner updated successfully.' });
        setTimeout(() => setNotification(null), 4000);
      } else {
        throw new Error(json.error || 'Failed to update campaign');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleSendRecovery = async (orderId: string) => {
    setSendingRecoveryId(orderId);
    setNotification(null);
    try {
      const res = await fetch(`/api/admin/marketing/abandoned/${orderId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountCode: 'RECOVER15' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNotification({ type: 'success', message: json.message });
        setTimeout(() => setNotification(null), 5000);
      } else {
        throw new Error(json.error || 'Failed to send recovery email');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSendingRecoveryId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-red-950/80 border-red-800 text-red-300'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('flashSale')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'flashSale'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Flash Sale Banner & Countdown
        </button>

        <button
          onClick={() => setActiveTab('abandoned')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'abandoned'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Abandoned Checkout Recovery
        </button>

        <button
          onClick={() => setActiveTab('newsletter')}
          className={`pb-3 flex items-center gap-2 transition-colors ${
            activeTab === 'newsletter'
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Newsletter Subscribers
        </button>
      </div>

      {/* Tab 1: Flash Sale Campaign */}
      {activeTab === 'flashSale' && (
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Live Banner Preview
            </h4>
            <div className="rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-3 text-white text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase">
                  {campaign.badge}
                </span>
                <span className="font-semibold">{campaign.headline}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-black/30 px-2 py-0.5 rounded text-[11px] font-mono text-amber-200">
                  ⚡ 06d : 14h : 22m : 40s
                </span>
                <span className="bg-white text-slate-900 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                  {campaign.couponCode}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveCampaign} className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4 text-xs">
            <h4 className="text-sm font-bold text-white">Campaign Configuration</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Headline Copy *</label>
                <input
                  type="text"
                  required
                  value={campaign.headline}
                  onChange={(e) => setCampaign({ ...campaign, headline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={campaign.badge}
                  onChange={(e) => setCampaign({ ...campaign, badge: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Promotional Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={campaign.couponCode}
                  onChange={(e) => setCampaign({ ...campaign, couponCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Countdown Expiration Target</label>
                <input
                  type="datetime-local"
                  value={campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setCampaign({ ...campaign, endDate: new Date(e.target.value).toISOString() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeBanner"
                checked={campaign.isActive}
                onChange={(e) => setCampaign({ ...campaign, isActive: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
              />
              <label htmlFor="activeBanner" className="text-slate-300 cursor-pointer">
                Display announcement banner at the top of the storefront
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <Button type="submit" disabled={savingCampaign} className="gap-1.5 shadow-md shadow-blue-600/30">
                {savingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Flash Sale Campaign
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Abandoned Checkouts */}
      {activeTab === 'abandoned' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Cart Total</th>
                    <th className="py-3 px-4">Initiated</th>
                    <th className="py-3 px-4 text-right">Recovery Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingAbandoned ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                        Scanning for abandoned sessions...
                      </td>
                    </tr>
                  ) : abandoned.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No abandoned checkouts discovered. All recent checkouts were completed or under 1 hour old.
                      </td>
                    </tr>
                  ) : (
                    abandoned.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {item.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-200">{item.customerName}</p>
                          <p className="text-[11px] text-slate-500">{item.customerEmail || 'No email'}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {item.itemCount} items
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          ${item.total.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            disabled={!item.customerEmail || sendingRecoveryId === item.id}
                            onClick={() => handleSendRecovery(item.id)}
                            className="h-7 px-2.5 text-[11px] gap-1 bg-blue-600 hover:bg-blue-500"
                          >
                            {sendingRecoveryId === item.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            Send Recovery Email
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Newsletter Subscribers */}
      {activeTab === 'newsletter' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Subscribers: <strong className="text-white">{totalSubscribers}</strong></span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subscriber Email</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingSubscribers ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                        Loading subscribers...
                      </td>
                    </tr>
                  ) : subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-500">
                        No subscribers registered yet.
                      </td>
                    </tr>
                  ) : (
                    subscribers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">{s.email}</td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(s.subscribedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {s.isActive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                              SUBSCRIBED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                              UNSUBSCRIBED
                            </span>
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
      )}
    </div>
  );
}
