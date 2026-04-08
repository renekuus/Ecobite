'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, ApiError } from '@/lib/api';
import type { LiveResponse, LiveOrder, LiveCourier, LiveTrip, LiveInsight, TripStop } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_ICON: Record<string, string> = {
  bike:       '🚲',
  cargo_bike: '📦',
  scooter:    '🛵',
  walk:       '🚶',
};

const STATUS_COLOR: Record<string, string> = {
  placed:     'bg-gray-100 text-gray-700',
  confirmed:  'bg-blue-100 text-blue-700',
  preparing:  'bg-orange-100 text-orange-700',
  ready:      'bg-amber-100 text-amber-800',
  assigned:   'bg-purple-100 text-purple-700',
  picked_up:  'bg-indigo-100 text-indigo-700',
  delivering: 'bg-sky-100 text-sky-800 font-semibold',
};

const TRIP_STATUS_COLOR: Record<string, string> = {
  active:  'bg-green-100 text-green-800',
  pending: 'bg-gray-100 text-gray-700',
};

const INSIGHT_STYLE: Record<string, string> = {
  batching:   'bg-violet-50 border-violet-200 text-violet-900',
  delay:      'bg-amber-50 border-amber-200 text-amber-900',
  efficiency: 'bg-sky-50 border-sky-200 text-sky-900',
  load:       'bg-rose-50 border-rose-200 text-rose-900',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageMin(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
}

function urgencyRing(urgency: string): string {
  if (urgency === 'red')    return 'ring-2 ring-red-400';
  if (urgency === 'yellow') return 'ring-1 ring-amber-400';
  return '';
}

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiStrip({ s, loading }: { s: LiveResponse['summary'] | null; loading: boolean }) {
  if (!s) return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`h-20 rounded-xl bg-gray-100 ${loading ? 'animate-pulse' : ''}`} />
      ))}
    </div>
  );

  const tiles = [
    { label: 'Active Orders',  value: s.totalActive,   color: 'text-gray-900',    bg: 'bg-white' },
    { label: 'Delayed',        value: s.delayedOrders,  color: s.delayedOrders > 0 ? 'text-red-600' : 'text-gray-400', bg: s.delayedOrders > 0 ? 'bg-red-50 border-red-200' : 'bg-white' },
    { label: 'Active Trips',   value: s.activeTrips,   color: 'text-purple-700',  bg: 'bg-white' },
    { label: 'Couriers Online',value: s.totalCouriers, color: 'text-sky-700',     bg: 'bg-white' },
    { label: 'Batched Trips',  value: s.batchedTrips,  color: s.batchedTrips > 0 ? 'text-violet-700' : 'text-gray-400', bg: 'bg-white' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {tiles.map(({ label, value, color, bg }) => (
        <div key={label} className={`${bg} border border-gray-200 rounded-xl px-4 py-4`}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className={`text-3xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── AI insights strip ────────────────────────────────────────────────────────

function InsightsStrip({ insights }: { insights: LiveInsight[] }) {
  if (insights.length === 0) return null;
  const hasDelay = insights.some(ins => ins.type === 'delay');
  return (
    <div className="flex flex-wrap gap-2">
      {insights.map((ins, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-xs font-medium ${INSIGHT_STYLE[ins.type] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}
        >
          <span className="text-sm leading-none">{ins.icon}</span>
          <span>{ins.message}</span>
        </div>
      ))}
      {hasDelay && (
        <Link
          href="/orders?status=delivering"
          className="flex items-center gap-1.5 border rounded-lg px-3 py-2 text-xs font-semibold bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
        >
          ↪ Review delayed orders
        </Link>
      )}
    </div>
  );
}

// ─── Needs Attention section ──────────────────────────────────────────────────

function NeedsAttention({ orders, onOrderClick }: { orders: LiveOrder[]; onOrderClick: (o: LiveOrder) => void }) {
  const urgent = orders.filter(o => o.urgency === 'red' || o.urgency === 'yellow');
  if (urgent.length === 0) return null;

  // First card with an actual delay gets the spotlight treatment
  const firstDelayedIdx = urgent.findIndex(o => o.delay_min !== null && o.delay_min > 0);

  return (
    <section>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-base">⚠</span>
        <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide">
          Needs Attention
        </h2>
        <span className="text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full">{urgent.length}</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-3">Orders requiring intervention</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {urgent.map((o, idx) => {
          const age           = ageMin(o.created_at);
          const snap          = o.delivery_address_snapshot;
          const isLate        = o.delay_min !== null && o.delay_min > 0;
          const isSpotlight   = idx === firstDelayedIdx && firstDelayedIdx !== -1;
          const borderCol     = o.urgency === 'red' ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-amber-50';
          const spotlightRing = isSpotlight ? 'ring-2 ring-red-400 ring-offset-1' : '';

          return (
            <button
              key={o.id}
              onClick={() => onOrderClick(o)}
              className={`text-left border-2 rounded-xl p-4 hover:shadow-md transition-shadow w-full ${borderCol} ${spotlightRing}`}
            >
              {/* Spotlight label — only on the first delayed order */}
              {isSpotlight && (
                <p className="text-[10px] font-semibold text-red-600 mb-1.5 flex items-center gap-1">
                  <span>⚠</span> Needs attention
                </p>
              )}

              {/* Header row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-gray-900">{o.order_number}</span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {isLate && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      LATE {o.delay_min}m
                    </span>
                  )}
                  {o.urgency === 'red' && !isLate && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      FLAGGED
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Merchant → Customer */}
              <p className="text-xs text-gray-700 flex items-center gap-1 min-w-0">
                <span className="font-medium truncate">{o.merchant_name ?? o.merchant_group}</span>
                <span className="text-gray-400 shrink-0">→</span>
                <span className="truncate">{o.customer_name ?? '—'}</span>
              </p>

              {/* Address + courier + age */}
              <div className="flex items-center justify-between mt-2 gap-2">
                <p className="text-[11px] text-gray-500 truncate">
                  {(snap as Record<string,string>)?.street ?? '—'}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {o.courier_name && (
                    <span className="text-[10px] text-gray-500">🏍 {o.courier_name}</span>
                  )}
                  <span className={`text-[10px] font-bold tabular-nums ${age > 45 ? 'text-red-600' : age > 20 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {age}m ago
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Stop sequence row ────────────────────────────────────────────────────────

function StopRow({ stop }: { stop: TripStop }) {
  const isPickup    = stop.type === 'pickup';
  const isDone      = stop.completed_at !== null;
  const name        = isPickup ? stop.merchant_name : stop.customer_name;
  const icon        = isPickup ? '🏪' : '📍';

  return (
    <li className={`flex items-start gap-2 py-1 ${isDone ? 'opacity-50' : ''}`}>
      <span className="text-xs leading-relaxed shrink-0 w-4 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-[10px] font-semibold uppercase tracking-wider mr-1.5 ${isPickup ? 'text-orange-600' : 'text-sky-600'}`}>
          {isPickup ? 'Pickup' : 'Drop'}
        </span>
        <span className="text-xs text-gray-700 truncate">{name ?? '—'}</span>
      </div>
      {isDone && <span className="text-[10px] text-green-500 shrink-0">✓</span>}
    </li>
  );
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip, expanded, onToggle }: {
  trip:     LiveTrip;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pickupCount  = trip.stops.filter(s => s.type === 'pickup').length;
  const dropoffCount = trip.stops.filter(s => s.type === 'dropoff').length;

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      {/* Card header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-900 truncate">
              {trip.courier_name ?? 'Unassigned'}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TRIP_STATUS_COLOR[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {trip.status}
            </span>
            {trip.is_batched && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800 tracking-wide">
                ✦ BATCHED
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {trip.order_count} order{trip.order_count !== 1 ? 's' : ''}
            {trip.stop_count > 0 && ` · ${trip.stop_count} stops`}
            {pickupCount > 0 && dropoffCount > 0 && ` · ${pickupCount}↑ ${dropoffCount}↓`}
            {trip.started_at && ` · started ${fmtTime(trip.started_at)}`}
          </p>
        </div>
        <span className={`text-gray-400 text-xs transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </div>

      {/* Stop sequence — shown when expanded */}
      {expanded && trip.stops.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-3 pt-2 bg-gray-50">
          <ul className="space-y-0.5">
            {trip.stops.map(stop => (
              <StopRow key={stop.seq} stop={stop} />
            ))}
          </ul>
          {trip.is_batched && (
            <p className="text-[10px] text-violet-600 font-medium mt-2 flex items-center gap-1">
              <span>✦</span>
              AI grouped · multi-stop efficiency trip
            </p>
          )}
        </div>
      )}

      {/* Empty stops state */}
      {expanded && trip.stops.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-[10px] text-gray-400">No stop data available</p>
        </div>
      )}
    </div>
  );
}

// ─── Couriers panel ───────────────────────────────────────────────────────────

function CouriersPanel({ couriers }: { couriers: LiveCourier[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
        Couriers Online <span className="text-gray-400 font-normal">({couriers.length})</span>
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {couriers.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl mb-2">😴</p>
            <p className="text-xs text-gray-400">No couriers online</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {couriers.map(c => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className="text-lg leading-none">{VEHICLE_ICON[c.vehicle_type] ?? '🚲'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {c.assigned_orders > 0
                      ? `${c.assigned_orders} order${c.assigned_orders !== 1 ? 's' : ''} · ${c.active_trips} trip${c.active_trips !== 1 ? 's' : ''}`
                      : <span className="text-gray-300">idle</span>
                    }
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.status === 'on_shift' ? 'bg-green-100 text-green-800' : 'bg-sky-100 text-sky-800'}`}>
                    {c.status === 'on_shift' ? 'on shift' : 'active'}
                  </span>
                  {c.assigned_orders > 0 && (
                    <div className="flex gap-0.5">
                      {[...Array(Math.min(c.assigned_orders, 5))].map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                      ))}
                      {c.assigned_orders > 5 && <span className="text-[9px] text-sky-400">+{c.assigned_orders - 5}</span>}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── All active orders table ───────────────────────────────────────────────────

function AllOrdersTable({ orders, onOrderClick }: { orders: LiveOrder[]; onOrderClick: (o: LiveOrder) => void }) {
  if (orders.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
        All Active Orders <span className="text-gray-400 font-normal">({orders.length})</span>
      </h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-5"></th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Order</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Merchant</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Customer</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Courier</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Address</th>
                <th className="text-right px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => {
                const age   = ageMin(o.created_at);
                const snap  = o.delivery_address_snapshot as Record<string, string>;
                const isLate = o.delay_min !== null && o.delay_min > 0;

                return (
                  <tr
                    key={o.id}
                    onClick={() => onOrderClick(o)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="pl-3 pr-1 py-2.5">
                      <span className={`inline-flex w-2 h-2 rounded-full ${o.urgency === 'red' ? 'bg-red-500' : o.urgency === 'yellow' ? 'bg-amber-400' : 'bg-transparent'}`} />
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium text-gray-800">
                      {o.order_number}
                      {isLate && <span className="ml-1.5 text-[9px] font-bold text-red-600 uppercase">late {o.delay_min}m</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[110px] truncate">{o.merchant_name ?? o.merchant_group}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[110px] truncate">{o.customer_name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[90px] truncate">{o.courier_name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 max-w-[140px] truncate">{snap?.street ?? '—'}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${age > 45 ? 'text-red-600' : age > 20 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {age}m
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Live page ────────────────────────────────────────────────────────────────

export default function LivePage() {
  const router = useRouter();

  const [data,       setData]       = useState<LiveResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [lastAt,     setLastAt]     = useState<string>('');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [countdown,  setCountdown]  = useState(15);

  const fetchLive = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    apiGet<LiveResponse>('/api/v1/admin/live')
      .then(d => {
        setData(d);
        setLastAt(new Date().toLocaleTimeString('fi-FI'));
        setCountdown(15);
      })
      .catch(e => setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Initial load + 15 s auto-refresh
  useEffect(() => {
    fetchLive();
    const interval = setInterval(() => fetchLive(true), 15_000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => setCountdown(n => Math.max(0, n - 1)), 1_000);
    return () => clearInterval(tick);
  }, []);

  function handleOrderClick(o: LiveOrder) {
    // Navigate to orders filtered by this status — useful drill-down
    router.push(`/orders?status=${o.status}`);
  }

  const s    = data?.summary;
  const hasUrgent = data ? data.activeOrders.some(o => o.urgency === 'red' || o.urgency === 'yellow') : false;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Live Operations</h1>
            {/* Live pulse */}
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              LIVE
            </span>
          </div>
          {lastAt && (
            <p className="text-xs text-gray-400 mt-1">
              Updated {lastAt} · next refresh in {countdown}s
            </p>
          )}
        </div>
        <button
          onClick={() => fetchLive()}
          disabled={loading}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className={loading ? 'animate-spin' : ''}>↺</span>
          Refresh
        </button>
      </div>

      {/* ── KPI strip ── */}
      <KpiStrip s={s ?? null} loading={loading} />

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Failed to load live data</p>
          <p className="font-mono text-xs mt-1 break-all">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="py-20 text-center text-sm text-gray-400 animate-pulse">
          Connecting to operations feed…
        </div>
      )}

      {data && (
        <>
          {/* ── AI Insights strip ── */}
          {data.insights.length > 0 && (
            <InsightsStrip insights={data.insights} />
          )}

          {/* ── Needs Attention ── */}
          {hasUrgent && (
            <div className="rounded-xl border-2 border-red-300 bg-white p-5">
              <NeedsAttention orders={data.activeOrders} onOrderClick={handleOrderClick} />
            </div>
          )}

          {/* ── No urgent = clean state ── */}
          {!hasUrgent && data.activeOrders.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-xs text-green-700 font-medium">
              <span>✓</span>
              All {data.activeOrders.length} active orders are on track — no urgency flags
            </div>
          )}

          {/* ── Trips + Couriers ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Active trips (2/3) */}
            <section className="xl:col-span-2 flex flex-col gap-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Active Trips
                <span className="text-gray-400 font-normal ml-1">({data.activeTrips.length})</span>
                {data.summary.batchedTrips > 0 && (
                  <span className="ml-2 text-violet-600">· {data.summary.batchedTrips} batched</span>
                )}
              </h2>

              {data.activeTrips.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl py-12 text-center">
                  <p className="text-2xl mb-2">🛣️</p>
                  <p className="text-sm text-gray-400">No active trips</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.activeTrips.map((trip: LiveTrip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      expanded={expandedTrip === trip.id}
                      onToggle={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Couriers (1/3) */}
            <CouriersPanel couriers={data.couriers} />

          </div>

          {/* ── All active orders table ── */}
          <AllOrdersTable orders={data.activeOrders} onOrderClick={handleOrderClick} />

          {data.activeOrders.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl py-20 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-sm font-medium text-gray-600">No active orders right now</p>
              <p className="text-xs text-gray-400 mt-1">Everything delivered — or nothing placed yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
