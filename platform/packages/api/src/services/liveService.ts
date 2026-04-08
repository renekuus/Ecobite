import { query } from '../lib/db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripStop {
  seq:           number;
  type:          'pickup' | 'dropoff';
  merchant_name: string | null;
  customer_name: string | null;
  order_id:      string | null;
  completed_at:  string | null;
}

export interface LiveOrder {
  id:                        string;
  order_number:              string;
  status:                    string;
  urgency:                   string;
  merchant_id:               string;
  merchant_name:             string | null;
  merchant_group:            string;
  customer_id:               string;
  customer_name:             string | null;
  courier_id:                string | null;
  courier_name:              string | null;   // new
  trip_id:                   string | null;   // new
  delivery_address_snapshot: Record<string, unknown>;
  subtotal_eur:              string;
  estimated_delivery_at:     string | null;
  created_at:                string;
  delay_min:                 number | null;   // new — minutes past ETA, null if not late
}

export interface LiveCourier {
  id:               string;
  name:             string;
  status:           string;
  vehicle_type:     string;
  active_trips:     number;
  assigned_orders:  number;
}

export interface LiveTrip {
  id:           string;
  courier_id:   string;
  courier_name: string | null;
  status:       string;
  order_count:  number;
  stop_count:   number;   // new — total stops including pickups
  is_batched:   boolean;  // new — true if > 1 order
  created_at:   string;
  started_at:   string | null;
  stops:        TripStop[]; // new — ordered stop sequence
}

export interface LiveInsight {
  type:    'batching' | 'delay' | 'efficiency' | 'load';
  icon:    string;
  message: string;
}

export interface LiveData {
  activeOrders: LiveOrder[];
  couriers:     LiveCourier[];
  activeTrips:  LiveTrip[];
  insights:     LiveInsight[];  // new
  updatedAt:    string;
  summary: {
    totalActive:   number;
    totalCouriers: number;
    onShift:       number;
    activeTrips:   number;
    delayedOrders: number;  // new
    batchedTrips:  number;  // new
  };
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = `'placed','confirmed','preparing','ready','assigned','picked_up','delivering'`;

// ─── Active orders ────────────────────────────────────────────────────────────

interface LiveOrderRow extends Omit<LiveOrder, 'delivery_address_snapshot'> {
  delivery_address_snapshot: Record<string, unknown>;
}

async function fetchActiveOrders(): Promise<LiveOrder[]> {
  const rows = await query<LiveOrderRow>(
    `SELECT
        o.id, o.order_number, o.status::text AS status, o.urgency::text AS urgency,
        o.merchant_id,  m.name  AS merchant_name,  o.merchant_group::text AS merchant_group,
        o.customer_id,  c.name  AS customer_name,
        o.courier_id,   cr.name AS courier_name,
        o.trip_id,
        o.delivery_address_snapshot,
        o.subtotal_eur, o.estimated_delivery_at, o.created_at,
        CASE
          WHEN o.estimated_delivery_at IS NOT NULL
           AND o.estimated_delivery_at < NOW()
          THEN GREATEST(0, EXTRACT(EPOCH FROM (NOW() - o.estimated_delivery_at))::int / 60)
          ELSE NULL
        END AS delay_min
       FROM orders o
       LEFT JOIN merchants m  ON m.id  = o.merchant_id
       LEFT JOIN customers c  ON c.id  = o.customer_id
       LEFT JOIN couriers  cr ON cr.id = o.courier_id
      WHERE o.status IN (${ACTIVE_STATUSES})
      ORDER BY
        CASE o.urgency WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END,
        CASE WHEN o.estimated_delivery_at < NOW() THEN 0 ELSE 1 END,
        o.created_at ASC
      LIMIT 200`,
    [],
  );
  return rows as LiveOrder[];
}

// ─── Couriers ─────────────────────────────────────────────────────────────────

async function fetchCouriers(): Promise<LiveCourier[]> {
  return query<LiveCourier>(
    `SELECT c.id, c.name, c.status::text AS status, c.vehicle_type::text AS vehicle_type,
            COUNT(DISTINCT t.id)  FILTER (WHERE t.status IN ('pending','active'))::int AS active_trips,
            COUNT(DISTINCT o.id)  FILTER (WHERE o.status IN (${ACTIVE_STATUSES}))::int  AS assigned_orders
       FROM couriers c
       LEFT JOIN trips  t ON t.courier_id = c.id AND t.status IN ('pending','active')
       LEFT JOIN orders o ON o.courier_id = c.id AND o.status IN (${ACTIVE_STATUSES})
      WHERE c.status IN ('active','on_shift')
      GROUP BY c.id, c.name, c.status, c.vehicle_type
      ORDER BY assigned_orders DESC, c.name ASC`,
    [],
  );
}

// ─── Active trips with stop sequences ────────────────────────────────────────

interface LiveTripRow {
  id:           string;
  courier_id:   string;
  courier_name: string | null;
  status:       string;
  order_count:  number;
  stop_count:   number;
  is_batched:   boolean;
  created_at:   string;
  started_at:   string | null;
  stops:        TripStop[] | null;
}

async function fetchActiveTrips(): Promise<LiveTrip[]> {
  const rows = await query<LiveTripRow>(
    `SELECT
        t.id, t.courier_id, c.name AS courier_name, t.status::text AS status,
        COUNT(ts.id) FILTER (WHERE ts.stop_type = 'dropoff')::int AS order_count,
        COUNT(ts.id)::int AS stop_count,
        (COUNT(ts.id) FILTER (WHERE ts.stop_type = 'dropoff') > 1)::bool AS is_batched,
        t.created_at, t.started_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'seq',           ts.sequence_number,
              'type',          ts.stop_type::text,
              'merchant_name', m2.name,
              'customer_name', cu.name,
              'order_id',      ts.order_id,
              'completed_at',  ts.completed_at
            )
            ORDER BY ts.sequence_number
          ) FILTER (WHERE ts.id IS NOT NULL),
          '[]'::json
        ) AS stops
       FROM trips t
       LEFT JOIN couriers   c  ON c.id  = t.courier_id
       LEFT JOIN trip_stops ts ON ts.trip_id = t.id
       LEFT JOIN merchants  m2 ON m2.id  = ts.merchant_id
       LEFT JOIN orders     o2 ON o2.id  = ts.order_id
       LEFT JOIN customers  cu ON cu.id  = o2.customer_id
      WHERE t.status IN ('pending','active')
         OR (t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '2 hours')
      GROUP BY t.id, t.courier_id, c.name, t.status, t.created_at, t.started_at
      ORDER BY
        CASE t.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
        t.created_at DESC
      LIMIT 100`,
    [],
  );

  return rows.map(r => ({ ...r, stops: r.stops ?? [] }));
}

// ─── AI insights (deterministic, derived from live data) ──────────────────────

function computeInsights(orders: LiveOrder[], trips: LiveTrip[]): LiveInsight[] {
  const insights: LiveInsight[] = [];

  const batchedTrips  = trips.filter(t => t.is_batched);
  const delayedOrders = orders.filter(o => o.delay_min !== null && (o.delay_min as number) > 0);
  const redOrders     = orders.filter(o => o.urgency === 'red');
  const batchedOrderCount = batchedTrips.reduce((sum, t) => sum + t.order_count, 0);

  // Batching insight
  if (batchedTrips.length > 0) {
    const savedRuns = batchedTrips.reduce((sum, t) => sum + (t.order_count - 1), 0);
    insights.push({
      type:    'batching',
      icon:    '✦',
      message: `${batchedTrips.length} batched trip${batchedTrips.length > 1 ? 's' : ''} · ${batchedOrderCount} orders grouped · est. ${savedRuns} fewer courier dispatches`,
    });
  }

  // Delay insight
  if (delayedOrders.length > 0) {
    const maxDelay = Math.max(...delayedOrders.map(o => o.delay_min as number));
    insights.push({
      type:    'delay',
      icon:    '⚠',
      message: `${delayedOrders.length} order${delayedOrders.length > 1 ? 's' : ''} past ETA · longest delay ${maxDelay}m`,
    });
  }

  // Flagged insight
  if (redOrders.length > 0 && delayedOrders.length === 0) {
    // Red from manual flag, not ETA breach
    insights.push({
      type:    'load',
      icon:    '🚩',
      message: `${redOrders.length} order${redOrders.length > 1 ? 's' : ''} manually flagged for attention`,
    });
  }

  // Efficiency insight (when batching is substantial)
  if (batchedOrderCount >= 4) {
    insights.push({
      type:    'efficiency',
      icon:    '🧠',
      message: `AI route grouping active · ${batchedOrderCount} orders optimized into ${batchedTrips.length} multi-stop trips`,
    });
  }

  return insights;
}

// ─── Public facade ────────────────────────────────────────────────────────────

export async function getLiveData(): Promise<LiveData> {
  const [activeOrders, couriers, activeTrips] = await Promise.all([
    fetchActiveOrders(),
    fetchCouriers(),
    fetchActiveTrips(),
  ]);

  const insights = computeInsights(activeOrders, activeTrips);

  return {
    activeOrders,
    couriers,
    activeTrips,
    insights,
    updatedAt: new Date().toISOString(),
    summary: {
      totalActive:   activeOrders.length,
      totalCouriers: couriers.length,
      onShift:       couriers.filter(c => c.status === 'on_shift').length,
      activeTrips:   activeTrips.filter(t => t.status === 'active' || t.status === 'pending').length,
      delayedOrders: activeOrders.filter(o => o.delay_min !== null && (o.delay_min as number) > 0).length,
      batchedTrips:  activeTrips.filter(t => t.is_batched).length,
    },
  };
}
