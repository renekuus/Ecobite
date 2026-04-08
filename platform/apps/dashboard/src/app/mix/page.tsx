'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, fmtEur, toISODate, daysAgo, ApiError } from '@/lib/api';
import type { MixResponse } from '@/lib/types';
import PeriodPicker, { type Period, resolvePeriod } from '@/components/PeriodPicker';
import MixChart from '@/components/MixChart';
import KpiCard from '@/components/KpiCard';

// ─── Mix & Migration page ─────────────────────────────────────────────────────

export default function MixPage() {
  const [data,    setData]    = useState<MixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [period,  setPeriod]  = useState<Period>(() =>
    resolvePeriod('month', '', ''),
  );

  const fetchMix = useCallback((p: Period) => {
    setLoading(true);
    setError(null);
    apiGet<MixResponse>('/api/v1/analytics/mix', {
      from: p.from,
      to:   p.to,
      gran: p.gran,
    })
      .then(setData)
      .catch(e => setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Fetch on mount with default period
  useEffect(() => { fetchMix(period); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    fetchMix(p);
  }

  // ── Derived KPIs ──
  const darkstoreShare = data?.days.length
    ? (() => {
        const last = data.days[data.days.length - 1]!;
        return (last.mix.darkstore * 100).toFixed(1);
      })()
    : null;

  const darkstoreRevShare = data?.days.length
    ? (() => {
        let dsRev = 0, totalRev = 0;
        for (const d of data.days) {
          dsRev    += d.segRevenue.darkstore;
          totalRev += Object.values(d.segRevenue).reduce((a, b) => a + b, 0);
        }
        return totalRev > 0 ? ((dsRev / totalRev) * 100).toFixed(1) : '0.0';
      })()
    : null;

  const blendedProfitPerOrder = data && data.totalOrders > 0
    ? (() => {
        const totalProfit = data.days.reduce(
          (sum, d) => sum + Object.values(d.segProfit).reduce((a, b) => a + b, 0),
          0,
        );
        return fmtEur(totalProfit / data.totalOrders);
      })()
    : null;

  const qsrShare = data?.days.length
    ? (() => {
        const last = data.days[data.days.length - 1]!;
        return (last.mix.qsr * 100).toFixed(1);
      })()
    : null;

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mix &amp; Migration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Order-mix evolution — QSR → Darkstore shift from real seeded data
        </p>
      </div>

      {/* ── Period picker ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Period</p>
        <PeriodPicker onChange={handlePeriodChange} defaultPeriod="month" />
        {data && (
          <p className="text-xs text-gray-400 mt-3 font-mono">
            {data.from} → {data.to} &nbsp;·&nbsp; {data.totalOrders.toLocaleString('fi-FI')} orders
            &nbsp;·&nbsp; {data.granularity} buckets
          </p>
        )}
      </div>

      {/* ── KPI cards ── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Darkstore Share (latest)"
            value={darkstoreShare !== null ? `${darkstoreShare}%` : '—'}
            sub="of orders in most recent bucket"
          />
          <KpiCard
            title="Darkstore Revenue Share"
            value={darkstoreRevShare !== null ? `${darkstoreRevShare}%` : '—'}
            sub="of total period GMV"
            accent
          />
          <KpiCard
            title="Contribution Profit / Order"
            value={blendedProfitPerOrder ?? '—'}
            sub="after courier cost allocation"
          />
          <KpiCard
            title="QSR Share (latest)"
            value={qsrShare !== null ? `${qsrShare}%` : '—'}
            sub={darkstoreShare && qsrShare
              ? parseFloat(darkstoreShare) > parseFloat(qsrShare)
                ? '📉 Darkstore now leads QSR'
                : `Darkstore closing gap`
              : undefined}
          />
        </div>
      )}

      {/* ── Chart card ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">Order Mix Evolution</h2>
          <span className="text-xs text-gray-400">{period.label}</span>
        </div>

        {loading && (
          <div className="h-48 rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
            <span className="text-sm text-gray-400">Loading chart…</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Failed to load mix data</p>
            <p className="font-mono text-xs mt-1 break-all">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <MixChart days={data.days} granularity={data.granularity} />
        )}
      </div>

    </div>
  );
}
