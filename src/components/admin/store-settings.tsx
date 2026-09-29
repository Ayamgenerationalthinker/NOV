'use client';

import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, CheckCircle2, Palette, Globe, Truck, RotateCcw } from 'lucide-react';

export function StoreSettings() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#10b981');
  const [policyShipping, setPolicyShipping] = useState('');
  const [policyReturns, setPolicyReturns] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadStore() {
      try {
        const res = await fetch('/api/seller/store');
        const data = await res.json();
        if (data.store) {
          setName(data.store.name || '');
          setSlug(data.store.slug || '');
          setDescription(data.store.description || '');
          setLogoUrl(data.store.logoUrl || '');
          setBannerUrl(data.store.bannerUrl || '');
          setBrandColor(data.store.brandColor || '#10b981');
          setPolicyShipping(data.store.policyShipping || '');
          setPolicyReturns(data.store.policyReturns || '');
        }
      } catch (err) {
        console.error('Failed to load store settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/seller/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || undefined,
          logoUrl: logoUrl || undefined,
          bannerUrl: bannerUrl || undefined,
          brandColor,
          policyShipping: policyShipping || undefined,
          policyReturns: policyReturns || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Store settings updated successfully.');
      } else {
        setMessage(data.error || 'Failed to update store.');
      }
    } catch (err: any) {
      setMessage(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading store configuration...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
      {message && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Brand Identity */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-3 text-emerald-400">
          <Store className="w-5 h-5" />
          <h2 className="text-base font-semibold text-white">Store Identity & Branding</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Store Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. NOV Luxe Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Storefront Slug
            </label>
            <input
              type="text"
              placeholder="nov-luxe-studio"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Store Bio / About
            </label>
            <textarea
              rows={3}
              placeholder="Crafting premium physical goods and digital assets for discerning creators."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Brand Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-zinc-800"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-3 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="text-base font-semibold text-white">Shipping & Return Policies</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1 flex items-center gap-2">
              <Truck className="w-4 h-4 text-zinc-400" /> Shipping Policy
            </label>
            <textarea
              rows={3}
              placeholder="Orders dispatched within 24-48 business hours via insured courier."
              value={policyShipping}
              onChange={(e) => setPolicyShipping(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-zinc-400" /> Returns Policy
            </label>
            <textarea
              rows={3}
              placeholder="14-day return window on physical items in original packaging. Digital downloads are non-refundable once accessed."
              value={policyReturns}
              onChange={(e) => setPolicyReturns(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !name}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl transition-all shadow-xl disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Store Profile'}
        </button>
      </div>
    </form>
  );
}
