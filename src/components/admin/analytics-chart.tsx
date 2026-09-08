'use client';

import React, { useState } from 'react';
import { DailySalesData } from '@/services/admin/analytics.service';
import { BarChart2, TrendingUp, Calendar } from 'lucide-react';

interface AnalyticsChartProps {
  initialData: DailySalesData[];
  currency?: string;
}

export function AnalyticsChart({
  initialData,
  currency = 'USD',
}: AnalyticsChartProps) {
  const [timeframe, setTimeframe] = useState<'7' | '14' | '30'>('30');
  const [hoveredPoint, setHoveredPoint] = useState<DailySalesData | null>(null);

  const daysCount = parseInt(timeframe, 10);
  const data = initialData.slice(-daysCount);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 10);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Revenue & Sales Velocity</h3>
              <p className="text-[11px] text-slate-400">
                Daily transaction volume for trailing {timeframe} days
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-950/80 p-0.5 border border-slate-800 text-xs">
            {(['7', '14', '30'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}D
              </button>
            ))}
          </div>

          <div className="hidden sm:block text-right border-l border-slate-800 pl-3">
            <div className="text-xs font-bold text-white">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">{totalOrders} orders</div>
          </div>
        </div>
      </div>

      {/* SVG Bar / Area Chart */}
      <div className="relative pt-6 pb-2">
        {/* Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-0 right-4 rounded-lg bg-slate-800/95 border border-slate-700 px-3 py-1.5 text-xs text-white shadow-lg pointer-events-none flex items-center gap-3 z-10 backdrop-blur-sm">
            <span className="text-slate-400 text-[11px]">{hoveredPoint.date}</span>
            <span className="font-bold text-emerald-400">
              ${hoveredPoint.revenue.toFixed(2)}
            </span>
            <span className="text-slate-300 text-[11px]">
              {hoveredPoint.orderCount} {hoveredPoint.orderCount === 1 ? 'order' : 'orders'}
            </span>
          </div>
        )}

        <div className="h-48 w-full flex items-end gap-1 sm:gap-2">
          {data.map((point) => {
            const heightPercent = Math.max(6, (point.revenue / maxRevenue) * 100);
            const isHovered = hoveredPoint?.date === point.date;

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    point.revenue > 0
                      ? isHovered
                        ? 'bg-blue-400 shadow-md shadow-blue-500/50'
                        : 'bg-blue-600/80 hover:bg-blue-500'
                      : 'bg-slate-800/40 hover:bg-slate-700/60'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-2 font-mono">
          <span>{data[0]?.date}</span>
          <span className="hidden sm:inline">
            {data[Math.floor(data.length / 2)]?.date}
          </span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
