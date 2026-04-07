'use client';

import { useEffect, useState, useCallback } from 'react';
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

// ─── Orders page ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [data,         setData]         = useState<OrdersResponse | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [offset,       setOffset]       = useState(0);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [actionBusy,   setActionBusy]   = useState<string | null>(null);  // orderId being actioned
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

  useEffect(() => { fetchOrders(statusFilter, offset); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">GP</th>
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
                const subtotal    = parseFloat(order.subtotal_eur);
                const deliveryFee = parseFloat(order.delivery_fee_eur);
                const tip         = parseFloat(order.tip_eur);
                const gp          = parseFloat(order.gross_profit_eur);
                const total       = subtotal + deliveryFee + tip;
                const isExpanded  = expanded === order.id;
                const isBusy      = actionBusy === order.id;
                const isTerminal  = TERMINAL.has(order.status);
                const isFlagged   = order.urgency === 'red';

                return [
                  // Main row
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
                    {/* Merchant name (from embedded object, fallback to group) */}
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
                    {/* Customer name (from embedded object) */}
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">
                      {order.customer?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs font-medium text-gray-800">
                      {fmtEur(total)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs text-green-700 font-medium">
                      {fmtEur(gp)}
                    </td>
                    {/* Action buttons */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {/* Flag / Unflag */}
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
                        {/* Cancel */}
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

                  // Expand row
                  isExpanded && (
                    <tr key={`${order.id}-expand`} className="bg-green-50 border-b border-green-100">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Order ID</p>
                            <p className="font-mono text-gray-700 break-all">{order.id}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Merchant</p>
                            <p className="text-gray-700">{order.merchant?.name ?? '—'}</p>
                            <p className="font-mono text-gray-400 text-[10px] mt-0.5 break-all">{order.merchant_id}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Customer</p>
                            <p className="text-gray-700">{order.customer?.name ?? '—'}</p>
                            {order.customer?.email && (
                              <p className="text-gray-400 text-[10px] mt-0.5">{order.customer.email}</p>
                            )}
                            {order.customer?.phone && (
                              <p className="text-gray-400 text-[10px]">{order.customer.phone}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Delivery Address</p>
                            <p className="text-gray-700">
                              {order.delivery_address_snapshot.street}<br />
                              {order.delivery_address_snapshot.city} {order.delivery_address_snapshot.postalCode}
                            </p>
                          </div>
                          {order.trip_id && (
                            <div>
                              <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Trip</p>
                              <p className="font-mono text-gray-700 break-all">{order.trip_id}</p>
                            </div>
                          )}
                          {order.actual_delivered_at && (
                            <div>
                              <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Delivered At</p>
                              <p className="text-gray-700">{fmtDate(order.actual_delivered_at)}</p>
                            </div>
                          )}
                          {order.cancellation_reason && (
                            <div>
                              <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Cancellation</p>
                              <p className="text-gray-700">{order.cancellation_reason}</p>
                            </div>
                          )}
                          {order.notes && (
                            <div>
                              <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Notes</p>
                              <p className="text-gray-700">{order.notes}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Commission</p>
                            <p className="text-green-700 font-medium">{fmtEur(parseFloat(order.commission_eur))}</p>
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
