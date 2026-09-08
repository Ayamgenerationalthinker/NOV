'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, X, Clock } from 'lucide-react';
import { FlashSaleCampaign } from '@/services/marketing/marketing.service';

export function AnnouncementBanner() {
  const [campaign, setCampaign] = useState<FlashSaleCampaign | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('nov_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
      return;
    }

    fetch('/api/marketing/flash-sale')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.isActive) {
          setCampaign(json.data);
        }
      })
      .catch(() => {
        // Fallback default campaign
        setCampaign({
          id: 'default',
          headline: 'Launch Week Flash Event: Get 25% Off All Digital Goods & Bundles',
          badge: 'FLASH SALE',
          couponCode: 'LAUNCH25',
          discountText: '25% OFF',
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
        });
      });
  }, []);

  useEffect(() => {
    if (!campaign?.endDate) return;

    const calculateTime = () => {
      const difference = +new Date(campaign.endDate) - +new Date();
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [campaign?.endDate]);

  if (dismissed || !campaign || !campaign.isActive) {
    return null;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(campaign.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('nov_banner_dismissed', 'true');
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 text-white text-xs py-2 px-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider text-white">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            {campaign.badge}
          </span>
          <span className="font-semibold text-white/95">
            {campaign.headline}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {timeLeft && (
            <div className="flex items-center gap-1 font-mono text-[11px] bg-black/30 px-2 py-0.5 rounded-md text-amber-200">
              <Clock className="w-3 h-3" />
              <span>
                {String(timeLeft.hours).padStart(2, '0')}h :{' '}
                {String(timeLeft.minutes).padStart(2, '0')}m :{' '}
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          )}

          {/* 1-Click Code Copier */}
          <button
            onClick={handleCopyCode}
            type="button"
            className="flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all"
            title="Click to copy coupon code"
          >
            <span className="font-mono tracking-wider">{campaign.couponCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3 text-slate-600" />
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white transition-colors p-0.5"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
