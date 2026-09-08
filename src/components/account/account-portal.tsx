'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatFileSize } from '@/lib/utils';
import {
  Download,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  Clock,
  Key,
  Receipt,
  Activity,
  User,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ExternalLink,
  Sparkles,
  LogOut,
  ChevronRight,
  Laptop,
  Mail,
} from 'lucide-react';

interface AccountPortalProps {
  initialSummary: {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      createdAt: Date | string;
    };
    stats: {
      totalProducts: number;
      totalOrders: number;
      totalDownloads: number;
    };
  };
  initialLibrary: Array<{
    id: string;
    grantedAt: Date | string;
    status?: string;
    product: {
      id: string;
      title: string;
      slug: string;
      coverImage?: string | null;
      description?: string | null;
      productType: string;
      files: Array<{
        id: string;
        fileName: string;
        fileSize: number | string;
        versionNumber: string;
        fileType: string;
        maxDownloads: number | null;
        customerDownloadCount: number;
      }>;
    };
  }>;
  initialOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    currency: string;
    paymentProvider: string | null;
    paidAt: Date | string | null;
    createdAt: Date | string;
    items: Array<{
      id: string;
      productId: string;
      productTitle: string;
      productSlug: string;
      productType: string;
      unitPrice: number;
      discountAmount: number;
      totalPrice: number;
    }>;
    transactions: Array<{
      id: string;
      provider: string;
      transactionRef: string;
      status: string;
      amount: number;
      currency: string;
      createdAt: Date | string;
    }>;
  }>;
  initialDownloads: Array<{
    id: string;
    fileId: string;
    fileName: string;
    versionNumber: string;
    fileSize: string;
    fileType: string;
    productId: string;
    productTitle: string;
    productSlug: string;
    ipAddress: string | null;
    userAgent: string | null;
    downloadedAt: Date | string;
  }>;
}

export function AccountPortal({
  initialSummary,
  initialLibrary,
  initialOrders,
  initialDownloads,
}: AccountPortalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'library' | 'orders' | 'downloads' | 'settings'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<AccountPortalProps['initialOrders'][0] | null>(null);
  const [selectedLicenseKey, setSelectedLicenseKey] = useState<{ title: string; key: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Settings form states
  const [name, setName] = useState(initialSummary.user.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Claim guest orders state
  const [claimingOrders, setClaimingOrders] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Email receipt state
  const [emailingReceipt, setEmailingReceipt] = useState(false);
  const [receiptEmailStatus, setReceiptEmailStatus] = useState<string | null>(null);

  const handleEmailReceipt = async (orderId: string) => {
    setEmailingReceipt(true);
    setReceiptEmailStatus(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/resend-receipt`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to email receipt');
      setReceiptEmailStatus('Receipt dispatched to your email!');
      setTimeout(() => setReceiptEmailStatus(null), 4000);
    } catch (err: any) {
      setReceiptEmailStatus(err.message || 'Error emailing receipt');
    } finally {
      setEmailingReceipt(false);
    }
  };

  // Filtered library items
  const filteredLibrary = initialLibrary.filter((item) =>
    item.product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product.productType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setProfileMessage({ text: 'Profile name updated successfully!' });
      router.refresh();
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'Error updating profile', error: true });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'New passwords do not match.', error: true });
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);

    try {
      const res = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPasswordMessage({ text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({ text: err.message || 'Error changing password', error: true });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleClaimOrders = async () => {
    setClaimingOrders(true);
    setClaimMessage(null);

    try {
      const res = await fetch('/api/account/claim-orders', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim orders');
      setClaimMessage({ text: data.message });
      if (data.claimedCount > 0) {
        router.refresh();
      }
    } catch (err: any) {
      setClaimMessage({ text: err.message || 'Error claiming orders', error: true });
    } finally {
      setClaimingOrders(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  return (
    <div className="space-y-8">
      {/* Account Overview Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-black text-white shadow-lg shadow-blue-500/20">
              {(initialSummary.user.name || initialSummary.user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">
                  {initialSummary.user.name || 'Digital Creator'}
                </h1>
                <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-[10px] uppercase font-bold">
                  {initialSummary.user.role}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{initialSummary.user.email}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Member since {new Date(initialSummary.user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-slate-800 hover:border-red-900 hover:bg-red-950/30 text-xs gap-1.5 text-slate-400 hover:text-red-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
            <Link href="/products">
              <Button size="sm" className="gap-1.5 shadow-lg shadow-blue-600/20 text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5" />
                Browse Catalog
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Purchased Products</p>
            <p className="text-2xl font-black text-white mt-1">{initialSummary.stats.totalProducts}</p>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Orders</p>
            <p className="text-2xl font-black text-white mt-1">{initialSummary.stats.totalOrders}</p>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Downloads</p>
            <p className="text-2xl font-black text-white mt-1">{initialSummary.stats.totalDownloads}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'library'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Digital Library ({initialSummary.stats.totalProducts})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Order History ({initialSummary.stats.totalOrders})
        </button>

        <button
          onClick={() => setActiveTab('downloads')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'downloads'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Download Activity ({initialSummary.stats.totalDownloads})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-white hover:border-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          Settings & Security
        </button>
      </div>

      {/* TAB 1: DIGITAL LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Your Licensed Digital Assets</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Lifetime access, instant download links, and future version upgrades.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {filteredLibrary.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">
                {searchQuery ? 'No products match your search query' : 'Your digital library is currently empty'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
                {searchQuery
                  ? 'Try clearing your search query or check spelling.'
                  : 'All verified digital goods purchased on NOV.com are delivered here with permanent signed access.'}
              </p>
              {!searchQuery && (
                <div className="mt-6">
                  <Link href="/products">
                    <Button size="sm" className="gap-1.5 shadow-lg shadow-blue-600/20">
                      Explore Store Catalog
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLibrary.map((item) => {
                // Generate a deterministic license key format for customer license management
                const licenseKey = `NOV-${item.id.slice(-4).toUpperCase()}-${item.product.id.slice(-4).toUpperCase()}-${item.product.slug.slice(0, 4).toUpperCase()}-LIC`;

                return (
                  <Card key={item.id} className="border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Left: Product Info */}
                        <div className="flex gap-4 items-start">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            <Layers className="w-7 h-7" />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-white">
                                <Link href={`/products/${item.product.slug}`} className="hover:text-blue-400 transition-colors">
                                  {item.product.title}
                                </Link>
                              </h3>
                              <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">
                                {item.product.productType}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                Acquired: {new Date(item.grantedAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Lifetime License
                              </span>
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLicenseKey({ title: item.product.title, key: licenseKey })}
                                className="h-7 px-2.5 text-[11px] gap-1.5 border-slate-800 text-slate-300 hover:border-slate-700"
                              >
                                <Key className="w-3 h-3 text-amber-400" />
                                View License Key
                              </Button>
                              <Link href={`/products/${item.product.slug}`} target="_blank">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] gap-1 text-slate-400 hover:text-white"
                                >
                                  Product Page
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Right: Attached Files List */}
                        <div className="w-full lg:w-96 space-y-2 pt-2 lg:pt-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                            <span>Download Assets ({item.product.files.length})</span>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-normal">
                              <ShieldCheck className="w-3 h-3" />
                              15-min signed URLs
                            </span>
                          </p>

                          {item.product.files.length === 0 ? (
                            <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                              No download files currently attached.
                            </p>
                          ) : (
                            item.product.files.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="text-xs font-semibold text-white truncate">{file.fileName}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="text-blue-400 font-mono">v{file.versionNumber}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(Number(file.fileSize))}</span>
                                    {file.maxDownloads && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-400">
                                          {file.customerDownloadCount}/{file.maxDownloads} downloads
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <a
                                  href={`/api/downloads/${file.id}`}
                                  className="shrink-0"
                                  download
                                >
                                  <Button size="sm" variant="primary" className="gap-1.5 text-xs h-8 px-3 shadow-md shadow-blue-500/10">
                                    <Download className="w-3.5 h-3.5" />
                                    Download
                                  </Button>
                                </a>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDER HISTORY & RECEIPTS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Order History & Digital Receipts</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review transaction histories, billing summaries, and item receipts.
            </p>
          </div>

          {initialOrders.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No orders recorded yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Your past checkout invoices and receipts will automatically show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {initialOrders.map((order) => {
                const isPaid = order.status === 'PAID';
                const isPending = order.status === 'PENDING';
                const isRefunded = order.status === 'REFUNDED';

                return (
                  <Card key={order.id} className="border-slate-800 bg-slate-900/60 overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-white">{order.orderNumber}</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                isPaid
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                  : isPending
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                  : isRefunded
                                  ? 'bg-purple-950/60 text-purple-400 border-purple-800/60'
                                  : 'bg-red-950/60 text-red-400 border-red-800/60'
                              }`}
                            >
                              {order.status}
                            </Badge>
                            {order.paymentProvider && (
                              <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">
                                {order.paymentProvider}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-black text-white">
                              {order.currency} ${order.total.toFixed(2)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {order.items.length} item{order.items.length > 1 ? 's' : ''}
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReceipt(order)}
                            className="h-8 text-xs gap-1.5 border-slate-700 text-slate-300 hover:text-white"
                          >
                            <Receipt className="w-3.5 h-3.5 text-blue-400" />
                            View Receipt
                          </Button>
                        </div>
                      </div>

                      {/* Items Summary preview */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300"
                          >
                            <span className="truncate max-w-[200px]">{item.productTitle}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-white font-medium">${item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DOWNLOAD ACTIVITY AUDIT */}
      {activeTab === 'downloads' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Download Activity Audit</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Full cryptographic download access history and security timestamps for your account.
            </p>
          </div>

          {initialDownloads.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
              <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No downloads logged yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Whenever you download a digital file from your library, an audit event will appear here.
              </p>
            </div>
          ) : (
            <Card className="border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <tr>
                      <th className="p-3.5 font-semibold">File & Product</th>
                      <th className="p-3.5 font-semibold">Version</th>
                      <th className="p-3.5 font-semibold">File Size</th>
                      <th className="p-3.5 font-semibold">IP Address</th>
                      <th className="p-3.5 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {initialDownloads.map((dl) => (
                      <tr key={dl.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-3.5">
                          <p className="font-semibold text-white">{dl.fileName}</p>
                          <p className="text-[11px] text-slate-400">{dl.productTitle}</p>
                        </td>
                        <td className="p-3.5 font-mono text-blue-400">v{dl.versionNumber}</td>
                        <td className="p-3.5 text-slate-300">{formatFileSize(Number(dl.fileSize))}</td>
                        <td className="p-3.5 font-mono text-slate-400">{dl.ipAddress || '—'}</td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(dl.downloadedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS & SECURITY */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Name */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Profile Settings
              </CardTitle>
              <CardDescription className="text-xs">
                Manage your public account name and contact identifier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileMessage && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                      profileMessage.error
                        ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                        : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    {profileMessage.error ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={initialSummary.user.email}
                    disabled
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Email address cannot be changed.</p>
                </div>

                <Input
                  label="Display Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />

                <Button type="submit" size="sm" disabled={profileSaving} className="w-full">
                  {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Ensure your account is protected with a secure password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordMessage && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                      passwordMessage.error
                        ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                        : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                    }`}
                  >
                    {passwordMessage.error ? (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />

                <Input
                  label="New Password (min 8 chars)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <Button type="submit" size="sm" variant="secondary" disabled={passwordSaving} className="w-full">
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Claim Past Guest Purchases */}
          <Card className="border-slate-800 bg-slate-900/60 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Claim Previous Guest Purchases
              </CardTitle>
              <CardDescription className="text-xs">
                Did you purchase digital products as a guest before creating this account? Scan our database and automatically bind them to your digital library.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {claimMessage && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                    claimMessage.error
                      ? 'bg-red-950/40 text-red-300 border border-red-800/40'
                      : 'bg-purple-950/40 text-purple-300 border border-purple-800/40'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{claimMessage.text}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-white">Scan for matching guest orders</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Searches for all past orders placed with <strong className="text-white">{initialSummary.user.email}</strong>.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleClaimOrders}
                  disabled={claimingOrders}
                  className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {claimingOrders ? 'Scanning Orders...' : 'Scan & Claim Purchases'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: ORDER RECEIPT */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-blue-400">Digital Tax Invoice</p>
                <h3 className="text-lg font-black text-white">Receipt #{selectedReceipt.orderNumber}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Date:</span>
                <span className="text-white">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{selectedReceipt.status}</span>
              </div>
              {selectedReceipt.paymentProvider && (
                <div className="flex justify-between text-slate-400">
                  <span>Payment Gateway:</span>
                  <span className="text-white">{selectedReceipt.paymentProvider}</span>
                </div>
              )}
            </div>

            {/* Line items */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
                Purchased Digital Items
              </p>
              {selectedReceipt.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-white">{item.productTitle}</p>
                    <p className="text-[10px] text-slate-500">{item.productType}</p>
                  </div>
                  <span className="font-medium text-white">${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>${selectedReceipt.subtotal.toFixed(2)}</span>
              </div>
              {selectedReceipt.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount:</span>
                  <span>-${selectedReceipt.discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>Total Amount:</span>
                <span>${selectedReceipt.total.toFixed(2)} {selectedReceipt.currency}</span>
              </div>
            </div>

            {receiptEmailStatus && (
              <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{receiptEmailStatus}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEmailReceipt(selectedReceipt.id)}
                disabled={emailingReceipt}
                className="w-full text-xs gap-1.5 border-slate-700 hover:bg-slate-800"
              >
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                {emailingReceipt ? 'Sending...' : 'Email Receipt'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="w-full text-xs gap-1.5 border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="w-full text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LICENSE KEY REVEAL */}
      {selectedLicenseKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Product License Key</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLicenseKey(null)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            <div>
              <p className="text-xs text-slate-400">Licensed to you for permanent usage with:</p>
              <p className="text-sm font-bold text-white mt-1">{selectedLicenseKey.title}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-bold text-emerald-400 truncate">
                {selectedLicenseKey.key}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyKey(selectedLicenseKey.key)}
                className="h-8 text-xs shrink-0 gap-1.5 border-slate-700 hover:bg-slate-800"
              >
                {copiedKey ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <p className="text-[11px] text-slate-500">
              Use this key to activate and register your product or access priority developer support.
            </p>

            <Button
              size="sm"
              onClick={() => setSelectedLicenseKey(null)}
              className="w-full text-xs"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
