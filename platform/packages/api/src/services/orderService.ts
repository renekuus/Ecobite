import { query } from '../lib/db.js';
import { OrderStatus } from '@ecobit/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  merchant_id: string;
  merchant_group: string;
  courier_id: string | null;
  trip_id: string | null;
  status: OrderStatus;
  delivery_address_snapshot: Record<string, unknown>;
  subtotal_eur: string;
  delivery_fee_eur: string;
  service_fee_eur: string;
  tip_eur: string;
  commission_eur: string;
  gross_profit_eur: string;
  estimated_delivery_at: string | null;
  actual_delivered_at: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  urgency: string;
  sla: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListOrdersParams {
  status?: OrderStatus;
  merchantId?: string;
  courierId?: string;
  limit?: number;
  offset?: number;
}

export interface ListOrdersResult {
  orders: OrderRow[];
  total: number;
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of orders.
 * Uses a window function to avoid a second COUNT query.
 */
export async function listOrders(params: ListOrdersParams): Promise<ListOrdersResult> {
  const { status, merchantId, courierId, limit = 50, offset = 0 } = params;

  // Build WHERE clauses dynamically
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (status) {
    conditions.push(`o.status = $${paramIdx++}::order_status`);
    values.push(status);
  }
  if (merchantId) {
    conditions.push(`o.merchant_id = $${paramIdx++}`);
    values.push(merchantId);
  }
  if (courierId) {
    conditions.push(`o.courier_id = $${paramIdx++}`);
    values.push(courierId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(limit, offset);
  const limitParam  = paramIdx++;
  const offsetParam = paramIdx;

  interface OrderWithCount extends OrderRow {
    total_count: string;
  }

  const rows = await query<OrderWithCount>(
    `SELECT
       o.*,
       COUNT(*) OVER () AS total_count
     FROM orders o
     ${where}
     ORDER BY o.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  const total = rows.length > 0 ? parseInt(rows[0]!.total_count, 10) : 0;
  const orders = rows.map(({ total_count: _tc, ...rest }) => rest as OrderRow);

  return { orders, total };
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const rows = await query<OrderRow>(
    'SELECT * FROM orders WHERE id = $1 LIMIT 1',
    [id],
  );
  return rows[0] ?? null;
}
