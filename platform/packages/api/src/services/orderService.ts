import { query, withTransaction, getPool } from '../lib/db.js';
import { OrderStatus } from '@ecobit/shared';

// ─── Embedded identity shapes ─────────────────────────────────────────────────

export interface OrderMerchant {
  id:    string;
  name:  string;
  group: string;
}

export interface OrderCustomer {
  id:    string;
  name:  string;
  email: string;
  phone: string;
}

// ─── Order row (enriched) ─────────────────────────────────────────────────────

export interface OrderRow {
  id:                        string;
  order_number:              string;
  customer_id:               string;
  merchant_id:               string;
  merchant_group:            string;
  courier_id:                string | null;
  trip_id:                   string | null;
  status:                    OrderStatus;
  delivery_address_snapshot: Record<string, unknown>;
  subtotal_eur:              string;
  delivery_fee_eur:          string;
  service_fee_eur:           string;
  tip_eur:                   string;
  commission_eur:            string;
  gross_profit_eur:          string;
  estimated_delivery_at:     string | null;
  actual_delivered_at:       string | null;
  notes:                     string | null;
  cancellation_reason:       string | null;
  urgency:                   string;
  sla:                       Record<string, unknown>;
  created_at:                string;
  updated_at:                string;
  // Embedded via JOIN — null if related row was deleted
  merchant:  OrderMerchant | null;
  customer:  OrderCustomer | null;
  // Trip economics — null when order has no trip yet
  trip_order_count:           number | null;
  allocated_courier_cost_eur: number;   // courier_payout / orders_in_trip (0 if no trip)
  contribution_profit_eur:    number;   // commission + fees − allocated_courier_cost
}

export interface ListOrdersParams {
  status?:     OrderStatus;
  merchantId?: string;
  courierId?:  string;
  limit?:      number;
  offset?:     number;
}

export interface ListOrdersResult {
  orders: OrderRow[];
  total:  number;
}

// ─── SELECT fragment shared by list and detail ────────────────────────────────

const ORDER_SELECT = `
  o.id, o.order_number, o.customer_id, o.merchant_id, o.merchant_group,
  o.courier_id, o.trip_id, o.status, o.delivery_address_snapshot,
  o.subtotal_eur, o.delivery_fee_eur, o.service_fee_eur, o.tip_eur,
  o.commission_eur, o.gross_profit_eur, o.sla, o.urgency, o.notes,
  o.cancellation_reason, o.estimated_delivery_at, o.actual_delivered_at,
  o.created_at, o.updated_at,
  json_build_object(
    'id',    m.id,
    'name',  m.name,
    'group', m.merchant_group::text
  ) AS merchant,
  json_build_object(
    'id',    c.id,
    'name',  c.name,
    'email', c.email,
    'phone', c.phone
  ) AS customer,
  tc.order_count::int                                                           AS trip_order_count,
  COALESCE(t.courier_payout_eur / NULLIF(tc.order_count, 0), 0)::float8        AS allocated_courier_cost_eur,
  (o.commission_eur + o.delivery_fee_eur + o.service_fee_eur
   - COALESCE(t.courier_payout_eur / NULLIF(tc.order_count, 0), 0))::float8    AS contribution_profit_eur
`;

// tc counts ALL orders per trip (not just those in the current query window)
// so courier cost is always split by the true trip size, not by filter results.
const ORDER_JOINS = `
  LEFT JOIN merchants m ON m.id = o.merchant_id
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN trips t ON t.id = o.trip_id
  LEFT JOIN (
    SELECT trip_id, COUNT(*)::float8 AS order_count
    FROM   orders
    WHERE  trip_id IS NOT NULL
    GROUP  BY trip_id
  ) tc ON tc.trip_id = o.trip_id
`;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const { status, merchantId, courierId, limit = 50, offset = 0 } = params;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let p = 1;

  if (status)     { conditions.push(`o.status = $${p++}::order_status`); values.push(status); }
  if (merchantId) { conditions.push(`o.merchant_id = $${p++}`);          values.push(merchantId); }
  if (courierId)  { conditions.push(`o.courier_id  = $${p++}`);          values.push(courierId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(limit, offset);
  const limitP = p++, offsetP = p;

  interface EnrichedRow extends OrderRow { total_count: string; }

  const rows = await query<EnrichedRow>(
    `SELECT ${ORDER_SELECT},
            COUNT(*) OVER () AS total_count
     FROM orders o ${ORDER_JOINS}
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${limitP} OFFSET $${offsetP}`,
    values,
  );

  const total  = rows.length > 0 ? parseInt(rows[0]!.total_count, 10) : 0;
  const orders = rows.map(({ total_count: _tc, ...rest }) => rest as OrderRow);
  return { orders, total };
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const rows = await query<OrderRow>(
    `SELECT ${ORDER_SELECT}
     FROM orders o ${ORDER_JOINS}
     WHERE o.id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

const TERMINAL = new Set(['delivered', 'cancelled', 'failed']);

export async function cancelOrder(
  orderId: string,
  actorId: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ status: string }>(
      'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
    );
    if (!rows[0]) return { ok: false, error: 'Order not found' };
    if (TERMINAL.has(rows[0].status)) {
      return { ok: false, error: `Cannot cancel an order in status "${rows[0].status}"` };
    }

    const note = reason ?? 'Cancelled by operator';
    await client.query(
      `UPDATE orders
          SET status = 'cancelled', cancellation_reason = $1, updated_at = NOW()
        WHERE id = $2`,
      [note, orderId],
    );

    await client.query(
      `INSERT INTO order_events
         (id, order_id, actor_type, actor_id, from_status, to_status, metadata, created_at)
       VALUES
         (gen_random_uuid(), $1, 'system', $2, $3::order_status, 'cancelled', $4::jsonb, NOW())`,
      [orderId, actorId, rows[0].status, JSON.stringify({ source: 'admin_cancel', reason: note })],
    );

    return { ok: true };
  });
}

// ─── Flag / unflag ────────────────────────────────────────────────────────────

export async function flagOrder(
  orderId: string,
  actorId: string,
  note?: string,
): Promise<void> {
  const text = note ?? 'Flagged by operator';
  await getPool().query(
    `UPDATE orders
        SET urgency    = 'red',
            notes      = CASE WHEN notes IS NULL THEN $1
                              ELSE notes || ' | ' || $1 END,
            updated_at = NOW()
      WHERE id = $2`,
    [text, orderId],
  );
  // Record in audit log without changing status
  await getPool().query(
    `INSERT INTO order_events
       (id, order_id, actor_type, actor_id, from_status, to_status, metadata, created_at)
     SELECT gen_random_uuid(), $1, 'system', $2, status, status, $3::jsonb, NOW()
       FROM orders WHERE id = $1`,
    [orderId, actorId, JSON.stringify({ source: 'admin_flag', note: text })],
  );
}

export async function unflagOrder(orderId: string): Promise<void> {
  await query(
    `UPDATE orders SET urgency = 'green', updated_at = NOW() WHERE id = $1`,
    [orderId],
  );
}
