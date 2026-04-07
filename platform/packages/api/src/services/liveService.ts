import { query } from '../lib/db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  delivery_address_snapshot: Record<string, unknown>;
  subtotal_eur:              string;
  estimated_delivery_at:     string | null;
  created_at:                string;
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
  id:               string;
  courier_id:       string;
  courier_name:     string | null;
  status:           string;
  order_count:      number;
  created_at:       string;
  started_at:       string | null;
}

export interface LiveData {
  activeOrders:  LiveOrder[];
  couriers:      LiveCourier[];
  activeTrips:   LiveTrip[];
  updatedAt:     string;
  summary: {
    totalActive:   number;
    totalCouriers: number;
    onShift:       number;
    activeTrips:   number;
  };
}

// ─── Active orders ────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = `'placed','confirmed','preparing','ready','assigned','picked_up','delivering'`;

async function fetchActiveOrders(): Promise<LiveOrder[]> {
  return query<LiveOrder>(
    `SELECT o.id, o.order_number, o.status, o.urgency,
            o.merchant_id, m.name AS merchant_name, o.merchant_group::text AS merchant_group,
            o.customer_id, c.name AS customer_name,
            o.courier_id, o.delivery_address_snapshot,
            o.subtotal_eur, o.estimated_delivery_at, o.created_at
       FROM orders o
       LEFT JOIN merchants m ON m.id = o.merchant_id
       LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.status IN (${ACTIVE_STATUSES})
      ORDER BY
        CASE o.urgency WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END,
        o.created_at ASC
      LIMIT 200`,
    [],
  );
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
      ORDER BY active_trips DESC, c.name ASC`,
    [],
  );
}

// ─── Active trips ─────────────────────────────────────────────────────────────

async function fetchActiveTrips(): Promise<LiveTrip[]> {
  return query<LiveTrip>(
    `SELECT t.id, t.courier_id, c.name AS courier_name, t.status::text AS status,
            COUNT(ts.id) FILTER (WHERE ts.stop_type = 'dropoff')::int AS order_count,
            t.created_at, t.started_at
       FROM trips t
       LEFT JOIN couriers   c  ON c.id  = t.courier_id
       LEFT JOIN trip_stops ts ON ts.trip_id = t.id
      WHERE t.status IN ('pending','active')
         OR (t.status = 'completed' AND t.completed_at > NOW() - INTERVAL '2 hours')
      GROUP BY t.id, t.courier_id, c.name, t.status, t.created_at, t.started_at
      ORDER BY t.created_at DESC
      LIMIT 100`,
    [],
  );
}

// ─── Public facade ────────────────────────────────────────────────────────────

export async function getLiveData(): Promise<LiveData> {
  const [activeOrders, couriers, activeTrips] = await Promise.all([
    fetchActiveOrders(),
    fetchCouriers(),
    fetchActiveTrips(),
  ]);

  return {
    activeOrders,
    couriers,
    activeTrips,
    updatedAt: new Date().toISOString(),
    summary: {
      totalActive:   activeOrders.length,
      totalCouriers: couriers.length,
      onShift:       couriers.filter(c => c.status === 'on_shift').length,
      activeTrips:   activeTrips.filter(t => t.status === 'active' || t.status === 'pending').length,
    },
  };
}
