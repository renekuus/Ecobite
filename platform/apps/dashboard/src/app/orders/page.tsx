'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost, fmtEur, fmtDate, ApiError } from '@/lib/api';
import type { OrdersResponse, OrderRow } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const ALL_STATUSES = [
  'placed', 'confirmed', 'preparing', 'ready',
  'assigned', 'picked_up', 'delivering', 'delivered',
  'cancelled', 'failed',
] as const;

const GROUP_LABEL: Record<string, string> = {
  qsr:        'QSR',
  restaurant: 'Restaurant',
  darkstore:  'Darkstore',
  other:      'Other',
};

const GROUP_COLOR: Record<string, string> = {
  qsr:        'bg-amber-100 text-amber-800',
  restaurant: 'bg-red-100 text-red-800',
  darkstore:  'bg-sky-100 text-sky-800',
  other:      'bg-violet-100 text-violet-800',
};

// ─── Economic breakdown panel (shown in expanded row) ─────────────────────────

function EconomicsPanel({ order }: { order: OrderRow }) {
  const subtotal    = parseFloat(order.subtotal_eur);
  const commission  = parseFloat(order.commission_eur);
  const deliveryFee = parseFloat(order.delivery_fee_eur);
  const serviceFee  = parseFloat(order.service_fee_eur);
  const courierCost = order.allocated_courier_cost_eur;
  const contrib     = order.contribution_profit_eur;
  const tripCount   = order.trip_order_count;
  const hasCourier  = courierCost > 0 || tripCount !== null;

  const contribPositive = contrib >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        Order Economics
      </p>

      {/* Revenue stack */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-gray-500">Basket (subtotal)</span>
          <span className="tabular-nums text-gray-700">{fmtEur(subtotal)}</span>
        </div>
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-gray-500">Commission</span>
          <span className="tabular-nums text-gray-700">+{fmtEur(commission)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-gray-500">Delivery fee</span>
            <span className="tabular-nums text-gray-700">+{fmtEur(deliveryFee)}</span>
          </div>
        )}
        {serviceFee > 0 && (
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-gray-500">Service fee</span>
            <span className="tabular-nums text-gray-700">+{fmtEur(serviceFee)}</span>
          </div>
        )}
      </div>

      {/* Courier cost */}
      <div className="border-t border-gray-100 pt-2 flex flex-col gap-1">
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-gray-500 flex items-center gap-1">
            Courier cost
            {hasCourier && tripCount !== null && (
              <span className="text-[10px] text-gray-400">
                (€20 ÷ {tripCount} order{tripCount !== 1 ? 's' : ''})
              </span>
            )}
            {hasCourier && tripCount === null && (
              <span className="text-[10px] text-gray-400">(no trip)</span>
            )}
          </span>
          <span className="tabular-nums text-red-600">−{fmtEur(courierCost)}</span>
        </div>
      </div>

      {/* Contribution profit */}
      <div className={`border-t pt-2 flex justify-between items-baseline ${contribPositive ? 'border-green-100' : 'border-red-100'}`}>
        <span className="text-xs font-semibold text-gray-700">Contribution profit</span>
        <span className={`text-sm font-bold tabular-nums ${contribPositive ? 'text-green-700' : 'text-red-600'}`}>
          {contribPositive ? '+' : ''}{fmtEur(contrib)}
        </span>
      </div>
    </div>
  );
}

// ─── Orders page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const searchParams   = useSearchParams();
  // Accept ?status= from Live Ops drill-down navigation
  const initialStatus  = searchParams.get('status') ?? '';

  const [data,         setData]         = useState<OrdersResponse | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [offset,       setOffset]       = useState(0);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [actionBusy,   setActionBusy]   = useState<string | null>(null);
  const [actionError,  setActionError]  = useState<string | null>(null);

  const fetchOrders = useCallback((statusVal: string, off: number) => {
    setLoading(true);
    setError(null);
    apiGet<OrdersResponse>('/api/v1/orders', {
      status: statusVal || undefined,
      limit:  PAGE_SIZE,
      offset: off,
    })
      .then(setData)
      .catch(e => setError(e instanceof ApiError ? `${e.status}: ${e.message}` : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchOrders(initialStatus, 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilter(status: string) {
    setStatusFilter(status);
    setOffset(0);
    fetchOrders(status, 0);
  }

  function prevPage() {
    const newOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(newOffset);
    fetchOrders(statusFilter, newOffset);
  }

  function nextPage() {
    if (!data) return;
    const newOffset = offset + PAGE_SIZE;
    if (newOffset < data.total) {
      setOffset(newOffset);
      fetchOrders(statusFilter, newOffset);
    }
  }

  async function handleCancel(orderId: string) {
    if (actionBusy) return;
    const reason = window.prompt('Cancellation reason (optional):') ?? '';
    setActionBusy(orderId);
    setActionError(null);
    try {
      await apiPost(`/api/v1/orders/${orderId}/cancel`, { reason: reason || undefined });
      fetchOrders(statusFilter, offset);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }

  async function handleFlag(orderId: string, currentUrgency: string) {
    if (actionBusy) return;
    setActionBusy(orderId);
    setActionError(null);
    try {
      if (currentUrgency === 'red') {
        await apiPost(`/api/v1/orders/${orderId}/unflag`);
      } else {
        const note = window.prompt('Flag note (optional):') ?? '';
        await apiPost(`/api/v1/orders/${orderId}/flag`, { note: note || undefined });
      }
      fetchOrders(statusFilter, offset);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setActionBusy(null);
    }
  }

  const total  = data?.total ?? 0;
  const orders = data?.orders ?? [];
  const page   = Math.floor(offset / PAGE_SIZE) + 1;
  const pages  = Math.ceil(total / PAGE_SIZE);

  const TERMINAL = new Set(['delivered', 'cancelled', 'failed']);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-1">
              {total.toLocaleString('fi-FI')} orders
              {statusFilter && ` · filtered by "${statusFilter}"`}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchOrders(statusFilter, offset)}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
        <button
          onClick={() => applyFilter('')}
          className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
            statusFilter === ''
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => applyFilter(s)}
            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
              statusFilter === s
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* ── Action error ── */}
      {actionError && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm text-orange-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-orange-400 hover:text-orange-600 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">Failed to load orders</p>
          <p className="font-mono text-xs mt-1 break-all">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-4"></th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Merchant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Basket</th>
                <th
                  className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-help"
                  title="Commission + delivery fee + service fee − allocated courier cost. Expand row for full breakdown."
                >
                  Contribution
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    <span className="inline-block animate-pulse">Loading orders…</span>
                  </td>
                </tr>
              )}

              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    No orders match this filter.
                  </td>
                </tr>
              )}

              {orders.map((order: OrderRow) => {
                const subtotal   = parseFloat(order.subtotal_eur);
                const contrib    = order.contribution_profit_eur;
                const isExpanded = expanded === order.id;
                const isBusy     = actionBusy === order.id;
                const isTerminal = TERMINAL.has(order.status);
                const isFlagged  = order.urgency === 'red';

                return [
                  // ── Main row ──
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-green-50' : ''} ${isFlagged && !isExpanded ? 'border-l-2 border-red-400' : ''}`}
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                  >
                    {/* Urgency dot */}
                    <td className="pl-4 pr-2 py-3" onClick={e => e.stopPropagation()}>
                      <span className={`inline-flex w-2 h-2 rounded-full ${isFlagged ? 'bg-red-500' : order.urgency === 'yellow' ? 'bg-amber-400' : 'bg-transparent'}`} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-800 font-medium">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {fmtDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex text-xs font-medium px-1.5 py-0.5 rounded-full ${GROUP_COLOR[order.merchant_group] ?? 'bg-gray-100 text-gray-600'}`}>
                          {GROUP_LABEL[order.merchant_group] ?? order.merchant_group}
                        </span>
                        {order.merchant?.name && (
                          <span className="text-xs text-gray-600 truncate max-w-[120px]">{order.merchant.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">
                      {order.customer?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    {/* Basket subtotal */}
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-gray-600">
                      {fmtEur(subtotal)}
                    </td>
                    {/* Contribution profit — green if positive, red if negative */}
                    <td className="px-4 py-3 text-right tabular-nums text-xs font-semibold">
                      <span className={contrib >= 0 ? 'text-green-700' : 'text-red-600'}>
                        {contrib >= 0 ? '+' : ''}{fmtEur(contrib)}
                      </span>
                      {order.trip_order_count !== null && order.trip_order_count > 1 && (
                        <span className="ml-1 text-[10px] font-normal text-violet-500" title={`Batched trip — ${order.trip_order_count} orders share courier cost`}>
                          ✦{order.trip_order_count}
                        </span>
                      )}
                    </td>
                    {/* Action buttons */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleFlag(order.id, order.urgency)}
                          disabled={isBusy}
                          title={isFlagged ? 'Remove flag' : 'Flag as urgent'}
                          className={`px-2 py-1 text-xs rounded border font-medium transition-colors disabled:opacity-40 ${
                            isFlagged
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-amber-400 hover:text-amber-700'
                          }`}
                        >
                          {isBusy ? '…' : isFlagged ? '🚩 Unflag' : '🚩'}
                        </button>
                        {!isTerminal && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={isBusy}
                            title="Cancel order"
                            className="px-2 py-1 text-xs rounded border font-medium bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-700 transition-colors disabled:opacity-40"
                          >
                            {isBusy ? '…' : '✕'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>,

                  // ── Expanded row ──
                  isExpanded && (
                    <tr key={`${order.id}-expand`} className="bg-green-50 border-b border-green-100">
                      <td colSpan={9} className="px-6 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                          {/* Economics panel */}
                          <EconomicsPanel order={order} />

                          {/* Order details */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 text-xs">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Details</p>
                            <div className="flex flex-col gap-2">
                              <div>
                                <p className="text-gray-400 font-medium mb-0.5">Order ID</p>
                                <p className="font-mono text-gray-700 break-all text-[11px]">{order.id}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-0.5">Merchant</p>
                                <p className="text-gray-700">{order.merchant?.name ?? '—'}</p>
                                <p className="font-mono text-gray-400 text-[10px]">{order.merchant_id}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-0.5">Customer</p>
                                <p className="text-gray-700">{order.customer?.name ?? '—'}</p>
                                {order.customer?.email && <p className="text-gray-400 text-[10px]">{order.customer.email}</p>}
                                {order.customer?.phone && <p className="text-gray-400 text-[10px]">{order.customer.phone}</p>}
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium mb-0.5">Delivery address</p>
                                <p className="text-gray-700">
                                  {order.delivery_address_snapshot.street},{' '}
                                  {order.delivery_address_snapshot.city}
                                </p>
                              </div>
                              {order.actual_delivered_at && (
                                <div>
                                  <p className="text-gray-400 font-medium mb-0.5">Delivered at</p>
                                  <p className="text-gray-700">{fmtDate(order.actual_delivered_at)}</p>
                                </div>
                              )}
                              {order.cancellation_reason && (
                                <div>
                                  <p className="text-gray-400 font-medium mb-0.5">Cancellation reason</p>
                                  <p className="text-gray-700">{order.cancellation_reason}</p>
                                </div>
                              )}
                              {order.notes && (
                                <div>
                                  <p className="text-gray-400 font-medium mb-0.5">Notes</p>
                                  <p className="text-gray-700">{order.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Trip details */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 text-xs">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trip & Courier</p>
                            {order.trip_id ? (
                              <div className="flex flex-col gap-2">
                                <div>
                                  <p className="text-gray-400 font-medium mb-0.5">Trip ID</p>
                                  <p className="font-mono text-gray-700 break-all text-[11px]">{order.trip_id}</p>
                                </div>
                                {order.trip_order_count !== null && (
                                  <div>
                                    <p className="text-gray-400 font-medium mb-0.5">Orders in trip</p>
                                    <p className="text-gray-700 flex items-center gap-1.5">
                                      {order.trip_order_count}
                                      {order.trip_order_count > 1 && (
                                        <span className="text-violet-600 font-semibold text-[10px] bg-violet-50 px-1.5 py-0.5 rounded-full">✦ BATCHED</span>
                                      )}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-gray-400 font-medium mb-0.5">Courier cost allocation</p>
                                  <p className="text-gray-700">
                                    €20.00 ÷ {order.trip_order_count ?? '?'} = <span className="font-semibold text-red-600">{fmtEur(order.allocated_courier_cost_eur)}</span>
                                  </p>
                                </div>
                                {order.courier_id && (
                                  <div>
                                    <p className="text-gray-400 font-medium mb-0.5">Courier ID</p>
                                    <p className="font-mono text-gray-700 break-all text-[11px]">{order.courier_id}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 text-gray-400">
                                <p>No trip assigned yet.</p>
                                <p className="text-[11px]">Courier cost will be allocated once the order is dispatched in a trip.</p>
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString('fi-FI')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={prevPage}
                disabled={offset === 0}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                {page} / {pages}
              </span>
              <button
                onClick={nextPage}
                disabled={offset + PAGE_SIZE >= total}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
