'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, fmtDate, ApiError } from '@/lib/api';
import type { LiveResponse, LiveOrder, LiveCourier, LiveTrip } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const URGENCY_CLASS: Record<string, string> = {
  red:    'bg-red-100 text-red-800 border-red-200',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200',
  green:  'bg-green-100 text-green-800 border-green-200',
};

const STATUS_CLASS: Record<string, string> = {
  placed:      'bg-gray-100 text-gray-700',
  confirmed:   'bg-blue-100 text-blue-700',
  preparing:   'bg-orange-100 text-orange-700',
  ready:       'bg-amber-100 text-amber-700',
  assigned:    'bg-purple-100 text-purple-700',
  picked_up:   'bg-indigo-100 text-indigo-700',
  delivering:  'bg-sky-100 text-sky-700',
};

const VEHICLE_ICON: Record<string, string> = {
  bike:       '🚲',
  cargo_bike: '📦',
  scooter:    '🛵',
  walk:       '🚶',
};

const COURIER_STATUS_CLASS: Record<string, string> = {
  on_shift: 'bg-green-100 text-green-800',
  active:   'bg-sky-100 text-sky-800',
};

// ─── Live page ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const [data,    setData]    = useState<LiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [lastAt,  setLastAt]  = useState<string>('');

  const fetchLive = useCallback(() => {
    setError(null);
    apiGet<LiveResponse>('/api/v1/admin/live')
      .then(d => { setData(d); setLastAt(new Date().toLocaleTimeString('fi-FI')); })
      .catch(e => setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLive();
    // Auto-refresh every 30 s
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const s = data?.summary;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Operations</h1>
          {lastAt && <p className="text-sm text-gray-500 mt-1">Last updated {lastAt} · auto-refreshes every 30 s</p>}
        </div>
        <button
          onClick={fetchLive}
          disabled={loading}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ↺ Refresh
        </button>
      </div>

      {/* ── Summary KPIs ── */}
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Orders',    value: s.totalActive,   color: 'text-gray-900' },
            { label: 'Online Couriers',  value: s.totalCouriers, color: 'text-sky-700'  },
            { label: 'On Shift',         value: s.onShift,       color: 'text-green-700' },
            { label: 'Active Trips',     value: s.activeTrips,   color: 'text-purple-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-3xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Failed to load live data</p>
          <p className="font-mono text-xs mt-1 break-all">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="text-center py-16 text-sm text-gray-400 animate-pulse">Loading live data…</div>
      )}

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Active orders (2/3 width) ── */}
          <section className="xl:col-span-2 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Active Orders ({data.activeOrders.length})
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Order</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Merchant</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Address</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-500 uppercase tracking-wide">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.activeOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                          No active orders right now 🎉
                        </td>
                      </tr>
                    )}
                    {data.activeOrders.map((o: LiveOrder) => {
                      const ageMin = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60_000);
                      const snap   = o.delivery_address_snapshot;
                      return (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex w-2 h-2 rounded-full flex-shrink-0 ${o.urgency === 'red' ? 'bg-red-500' : o.urgency === 'yellow' ? 'bg-amber-400' : 'bg-green-500'}`} />
                              <span className="font-mono font-medium text-gray-800">{o.order_number}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                            {o.merchant_name ?? o.merchant_group}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                            {o.customer_name ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {o.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                            {snap?.street ?? '—'}
                          </td>
                          <td className={`px-4 py-3 tabular-nums font-medium ${ageMin > 45 ? 'text-red-600' : ageMin > 20 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {ageMin}m
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── Right column: Couriers + Trips ── */}
          <section className="flex flex-col gap-6">

            {/* Couriers */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Couriers Online ({data.couriers.length})
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {data.couriers.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-gray-400 text-center">No couriers online</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {data.couriers.map((c: LiveCourier) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                        <span className="text-base leading-none">{VEHICLE_ICON[c.vehicle_type] ?? '🚲'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {c.active_trips} trip{c.active_trips !== 1 ? 's' : ''} · {c.assigned_orders} order{c.assigned_orders !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${COURIER_STATUS_CLASS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Active trips */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Active Trips ({data.activeTrips.length})
              </h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {data.activeTrips.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-gray-400 text-center">No active trips</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {data.activeTrips.map((t: LiveTrip) => (
                      <li key={t.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-800 truncate">
                            {t.courier_name ?? 'Unassigned'}
                          </p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {t.order_count} stop{t.order_count !== 1 ? 's' : ''} · started {t.started_at ? fmtDate(t.started_at) : fmtDate(t.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </section>
        </div>
      )}
    </div>
  );
}
