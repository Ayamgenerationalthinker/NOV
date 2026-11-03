'use client';

import { formatCurrency } from '@/lib/utils';

import React, { useState } from 'react';
import { DailySalesData } from '@/services/admin/analytics.service';
import { TrendingUp } from 'lucide-react';

interface AnalyticsChartProps {
  initialData: DailySalesData[];
  currency?: string;
}

export function AnalyticsChart({
  initialData,
  currency = 'GHS',
}: AnalyticsChartProps) {
  const [timeframe, setTimeframe] = useState<'7' | '14' | '30'>('30');
  const [hoveredPoint, setHoveredPoint] = useState<DailySalesData | null>(null);

  const daysCount = parseInt(timeframe, 10);
  const data = initialData.slice(-daysCount);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 10);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);
  const shown = hoveredPoint ?? null;

  return (
    <div className="rounded-3xl border border-[#e1e7f4] bg-[#ffffff] p-5 shadow-[0_1px_2px_rgba(0,22,80,0.04)] sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7efff] text-[#0b5cff]">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-[#001650]">Sales</h2>
            <p className="text-sm text-[#46557d]">Paid orders over the last {timeframe} days</p>
          </div>
        </div>

        <div role="group" aria-label="Time range" className="flex w-fit items-center rounded-full bg-[#f3f6fd] p-1 text-sm">
          {(['7', '14', '30'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              aria-pressed={timeframe === tf}
              onClick={() => setTimeframe(tf)}
              className={`min-h-9 rounded-full px-3.5 font-semibold transition-colors ${
                timeframe === tf ? 'bg-[#0b5cff] text-[#ffffff] shadow-sm' : 'text-[#46557d] hover:text-[#001650]'
              }`}
            >
              {tf} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="text-sm text-[#46557d]">{shown ? shown.date : 'Revenue'}</p>
          <p className="font-heading text-[28px] font-extrabold tabular-nums text-[#001650]">
            {formatCurrency(shown ? shown.revenue : totalRevenue, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[#46557d]">Orders</p>
          <p className="font-heading text-[28px] font-extrabold tabular-nums text-[#001650]">{shown ? shown.orderCount : totalOrders}</p>
        </div>
      </div>

      <div className="mt-5 flex h-48 w-full items-end gap-1 sm:gap-1.5">
        {data.map((point) => {
          const heightPercent = Math.max(4, (point.revenue / maxRevenue) * 100);
          const isHovered = hoveredPoint?.date === point.date;
          return (
            <div
              key={point.date}
              className="flex h-full flex-1 cursor-pointer flex-col justify-end"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
              title={`${point.date}: ${formatCurrency(point.revenue, currency)}, ${point.orderCount} order${point.orderCount === 1 ? '' : 's'}`}
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full rounded-t-md transition-colors duration-200 ${
                  point.revenue > 0 ? (isHovered ? 'bg-[#001650]' : 'bg-gradient-to-t from-[#0b5cff] to-[#5b93ff]') : 'bg-[#e7efff]'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-[#e1e7f4] pt-2 text-xs tabular-nums text-[#56668f]">
        <span>{data[0]?.date}</span>
        <span className="hidden sm:inline">{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
