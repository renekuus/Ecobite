'use client';

import { useState } from 'react';
import type { MixDayPoint, SegMap } from '@/lib/types';
import { fmtEur } from '@/lib/api';

// ─── Colours (mirrors simulation dashboard) ───────────────────────────────────

const SEG_COLOR: Record<keyof SegMap, string> = {
  qsr:        '#f59e0b',
  restaurant: '#ef4444',
  other:      '#8b5cf6',
  darkstore:  '#0ea5e9',
};

const SEG_LABEL: Record<keyof SegMap, string> = {
  qsr:        'QSR',
  restaurant: 'Restaurant',
  other:      'Other',
  darkstore:  'Darkstore',
};

const SEGMENTS = ['darkstore', 'other', 'restaurant', 'qsr'] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TooltipData {
  day:  MixDayPoint;
  x:    number;
  y:    number;
}

interface MixChartProps {
  days:        MixDayPoint[];
  granularity: string;
}

// ─── Stacked bar chart ────────────────────────────────────────────────────────

export default function MixChart({ days, granularity }: MixChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  if (days.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-gray-400">
        No order data for this period.
      </div>
    );
  }

  const lastDay  = days[days.length - 1]!;
  const firstDay = days[0]!;

  // ── Segment summary table ──────────────────────────────────────────────────

  // Accumulate totals across all buckets
  const totOrders:  Record<string, number> = {};
  const totRevenue: Record<string, number> = {};
  const totProfit:  Record<string, number> = {};
  let grandOrders  = 0;
  let grandRevenue = 0;
  let grandProfit  = 0;

  for (const d of days) {
    for (const g of SEGMENTS) {
      totOrders[g]  = (totOrders[g]  ?? 0) + d.segOrders[g];
      totRevenue[g] = (totRevenue[g] ?? 0) + d.segRevenue[g];
      totProfit[g]  = (totProfit[g]  ?? 0) + d.segProfit[g];
    }
    grandOrders  += d.totalOrders;
    grandRevenue += Object.values(d.segRevenue).reduce((a, b) => a + b, 0);
    grandProfit  += Object.values(d.segProfit).reduce((a, b) => a + b, 0);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stacked bar chart ── */}
      <div className="relative">
        {/* Axis labels */}
        <div className="flex justify-between mb-1 px-0.5">
          <span className="text-[10px] text-gray-400 font-mono">{firstDay.date}</span>
          <span className="text-[10px] text-gray-400 font-mono">{lastDay.date}</span>
        </div>

        {/* Bars container */}
        <div
          className="flex items-end gap-px overflow-hidden rounded-lg"
          style={{ height: 200 }}
          onMouseLeave={() => setTooltip(null)}
        >
          {days.map((day, i) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col-reverse min-w-[3px] cursor-crosshair"
              style={{
                outline: i === days.length - 1 ? '2px solid #22c55e' : undefined,
                outlineOffset: '1px',
              }}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTooltip({ day, x: rect.left, y: rect.top });
              }}
            >
              {SEGMENTS.map(seg => {
                const frac = day.mix[seg] ?? 0;
                if (frac === 0) return null;
                return (
                  <div
                    key={seg}
                    style={{
                      height:          `${frac * 100}%`,
                      backgroundColor: SEG_COLOR[seg],
                      minHeight:       2,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]"
            style={{ left: Math.min(tooltip.x, window.innerWidth - 200), top: tooltip.y - 160 }}
          >
            <p className="font-semibold text-gray-800 mb-2 font-mono">{tooltip.day.date}</p>
            <p className="text-gray-500 mb-1.5">{tooltip.day.totalOrders} orders total</p>
            <div className="flex flex-col gap-1">
              {SEGMENTS.map(seg => {
                const n = tooltip.day.segOrders[seg];
                if (!n) return null;
                const pct = ((tooltip.day.mix[seg] ?? 0) * 100).toFixed(1);
                return (
                  <div key={seg} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: SEG_COLOR[seg] }} />
                    <span className="text-gray-600 flex-1">{SEG_LABEL[seg]}</span>
                    <span className="font-mono text-gray-800">{n}</span>
                    <span className="text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 justify-between items-center">
          <div className="flex gap-3 flex-wrap">
            {SEGMENTS.map(seg => (
              <div key={seg} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: SEG_COLOR[seg] }} />
                {SEG_LABEL[seg]}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
            {granularity} buckets
          </span>
        </div>
      </div>

      {/* ── Segment summary table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Segment</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">Orders</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">Mix</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">Revenue</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">Contribution Profit</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500">Margin</th>
            </tr>
          </thead>
          <tbody>
            {SEGMENTS.map(seg => {
              const orders  = totOrders[seg]  ?? 0;
              const revenue = totRevenue[seg] ?? 0;
              const profit  = totProfit[seg]  ?? 0;
              const margin  = revenue > 0 ? profit / revenue : 0;
              const mix     = grandOrders > 0 ? orders / grandOrders : 0;
              return (
                <tr key={seg} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SEG_COLOR[seg] }} />
                    <span className="font-medium text-gray-700">{SEG_LABEL[seg]}</span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-700">{orders.toLocaleString('fi-FI')}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-500">{(mix * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtEur(revenue)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtEur(profit)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-gray-500">{(margin * 100).toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2.5 px-3 font-semibold text-gray-800 bg-green-50 rounded-bl-lg border-l-2 border-green-500">
                TOTAL
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-800 bg-green-50">
                {grandOrders.toLocaleString('fi-FI')}
              </td>
              <td className="py-2.5 px-3 bg-green-50 text-right text-gray-500">100%</td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-800 bg-green-50">
                {fmtEur(grandRevenue)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-800 bg-green-50">
                {fmtEur(grandProfit)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-800 bg-green-50 rounded-br-lg">
                {grandRevenue > 0 ? ((grandProfit / grandRevenue) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
