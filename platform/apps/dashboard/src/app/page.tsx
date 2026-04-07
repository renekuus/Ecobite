'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, fmtEur, toISODate, daysAgo, today, ApiError } from '@/lib/api';
import type { SummaryResponse, HealthResponse } from '@/lib/types';
import KpiCard from '@/components/KpiCard';

// ─── Dashboard home — summary KPIs + health ───────────────────────────────────

const PERIOD_FROM = toISODate(daysAgo(29)); // last 30 days
const PERIOD_TO   = today();

export default function HomePage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [health,  setHealth]  = useState<HealthResponse  | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<SummaryResponse>('/api/v1/analytics/summary', { from: PERIOD_FROM, to: PERIOD_TO }),
      apiGet<HealthResponse>('/health'),
    ])
      .then(([s, h]) => { setSummary(s); setHealth(h); })
      .catch(e => setError(e instanceof ApiError ? `API error ${e.status}: ${e.message}` : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const deliveryRate = summary
    ? ((summary.deliveredOrders / Math.max(summary.totalOrders, 1)) * 100).toFixed(1)
    : null;

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last 30 days &nbsp;·&nbsp;
            <span className="font-mono">{PERIOD_FROM}</span>
            {' → '}
            <span className="font-mono">{PERIOD_TO}</span>
          </p>
        </div>

        {/* API health dot */}
        {health && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            API {health.status}
            &nbsp;·&nbsp;
            {health.redis.startsWith('connected') ? '🟢 Redis' : '🟡 Redis degraded'}
          </div>
        )}
      </div>

      {/* ── Error / loading ── */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Could not load summary data</p>
          <p className="font-mono text-xs break-all">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            Check that the API is running on{' '}
            <code className="font-mono">{process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}</code>
            {' '}and that <code className="font-mono">NEXT_PUBLIC_ADMIN_TOKEN</code> is set.
          </p>
        </div>
      )}

      {/* ── KPI cards ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Orders"
            value={summary.totalOrders.toLocaleString('fi-FI')}
            sub={`${summary.deliveredOrders.toLocaleString('fi-FI')} delivered · ${summary.cancelledOrders.toLocaleString('fi-FI')} cancelled`}
          />
          <KpiCard
            title="Gross Merchandise Value"
            value={fmtEur(summary.totalGmvEur)}
            sub="sum of all subtotals"
          />
          <KpiCard
            title="Gross Profit"
            value={fmtEur(summary.totalGrossProfitEur)}
            sub={`${summary.totalGmvEur > 0 ? ((summary.totalGrossProfitEur / summary.totalGmvEur) * 100).toFixed(1) : 0}% margin`}
            accent
          />
          <KpiCard
            title="Avg Order Value"
            value={fmtEur(summary.avgOrderValueEur)}
            sub={deliveryRate !== null ? `${deliveryRate}% delivery rate` : undefined}
          />
        </div>
      )}

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/orders"
          className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-green-400 transition-colors"
        >
          <div className="text-2xl mb-2">📦</div>
          <p className="font-semibold text-gray-800 group-hover:text-green-700">Orders</p>
          <p className="text-xs text-gray-500 mt-1">Browse and filter all orders from the seeded database</p>
        </Link>
        <Link
          href="/mix"
          className="group bg-white border border-gray-200 rounded-xl p-5 hover:border-green-400 transition-colors"
        >
          <div className="text-2xl mb-2">📈</div>
          <p className="font-semibold text-gray-800 group-hover:text-green-700">Mix &amp; Migration</p>
          <p className="text-xs text-gray-500 mt-1">QSR → Darkstore shift over time, backed by real order data</p>
        </Link>
      </div>

      {/* ── Provisional notice ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-700">
        <p className="font-semibold mb-1">⚠ Provisional auth</p>
        <p>
          This dashboard uses a static bearer token (<code className="font-mono">NEXT_PUBLIC_ADMIN_TOKEN</code>).
          A login page and session management will be added in a future step.
        </p>
      </div>

    </div>
  );
}
